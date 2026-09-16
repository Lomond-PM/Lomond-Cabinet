# 0.3.12-B2 / A08 — Detach 源层注释归属与恢复

**当前状态：A08（含F1/F1a/F1b）TARGETED_ACCEPTED / READY FOR COMMIT / PR。R1/R2/R3及三次原生Undo均PASS；INTEGRATED_ACCEPTED / CLOSED留待0.3.12-G，B2/0.3.12未完成。**

F1前有限真实验收：装载 PASS、Icon Grid PASS、Feature Stack FAIL。Feature Stack Detach 返回成功，但解除 parent 后出现5处表达式错误；原生 Undo 已恢复所检查的B1字段。详见本文末尾实机记录及 [实机汇总](vela-0.3.12-b2-a08-real-ae/summary.json)。

2026-09-10 初始A08实施轮（F1前历史）：保留 Host `detachSelectedComponent` 已修复，A08 focused **251 assertions PASS**，最终状态全量离线 **186 discovered / 186 executed / 186 PASS / 0 FAIL / 0 skip**。该实施轮未操作 AE、Provider 或原生 Undo。当时A08 尚未 TARGETED_ACCEPTED / CLOSED；B2、0.3.12 未完成，不进入 A09。

F1实施轮：当前帧定稿、完整工具模板准入、统一采样及有界2D空间补偿；**421 focused assertions、重跑A08 251 assertions、187/187 offline suites PASS（0 skip）**。该实施轮没有真实AE操作；原Feature FAIL、Grid PASS和Undo证据保持不变。随后F1实机复验已在正常Feature预检拒绝处停止，未达成定向验收；详见本文末尾新记录。

F1a实施轮：Text/Shape类型感知准入小补丁，1134项定向、重新执行A08 251项及187/187离线套件通过（0 skip）。随后2026-09-11真实复验R1在额外依赖/属性扫描预检失败，独立B1/B2所查字段未变，停止R2/R3、未执行Undo；该次实机未重跑离线。前两次Feature失败保持历史，当时A08尚未TARGETED_ACCEPTED。详见相应历史实机记录。

F1b实施与当前验收：D1已确认当前AE五个Property的结构locator一致而wrapper引用不等；F1b现以compId/layerId及完整propertyIndex+matchName路径作私有preflight匹配，并经用户追加授权预先关联Position release校验目标，不在执行阶段重新resolve。F1b 932项定向、重新执行F1/F1a 1134项及A08 251项通过；全量仅运行一次，188 discovered/executed、187 PASS、1 FAIL、0 skip，唯一失败为i18n生成报告过期，原脚本更新后该suite单独46项PASS，生产/测试未再变更；不表述为全量188/188 PASS。以上为F1b实施轮离线事实，本次实机未重跑。2026-09-11正常装载后，R1正常Feature、R2非零t=1秒定稿、R3原Grid小回验及三次用户原生Undo均PASS；独立B3所查字段均恢复B1。A08（含F1/F1a/F1b）现为TARGETED_ACCEPTED / READY FOR COMMIT / PR，仅覆盖普通2D、已识别类型/完整Feature模板和受支持平移父链的当前帧定稿；Detach注册/UI未交付，未来接入仍需回验。INTEGRATED_ACCEPTED / CLOSED留待0.3.12-G，B2/0.3.12未完成，不进入A09。

以下初始实施、F1实施及实机章节保留各自当时范围；“不处理表达式/不做定稿”、统一拒绝collapse及当时等待裁定描述均不代表F1b当前规则。

H0 留存说明（2026-09-11）：以下章节的阶段状态、原始文件数量和执行结果均保持当时事实。完整原始诊断保留在本地临时证据工作区，不属于版本控制交付；已迁移的原始材料链接改指对应保留摘要，不能把摘要当成原始回调。历史 JSON 的原路径按各目录 index.json 的归档规则解释，原索引亦已原字节归档。清理范围、前后统计及实际保留清单见 [A08-H0 记录](vela-0.3.12-b2-a08-evidence-retention.md)。

## 基线与范围裁定

| 项目 | 实际结果 |
|---|---|
| 分支 | `fix/ad-component-detach-a08-0.3.12` |
| HEAD / 本地 origin/dev | 均为 `d7dd7356cccbb637ae01a7e9d0629b9bc184a388` |
| Git 对应 | `git log -1 --format=fuller` 确认 Merge pull request #204，G-02 合并；未 fetch，origin/dev 为本地已存在引用 |
| 起始工作树 | `git status -sb` 无修改 |
| 当前修复提交 | 尚未创建；HEAD 是实施基线，不能充当修复提交 |
| 生产修改 | 仅 `host/tools/adComponentKit.jsx` 的源层 metadata 写入及保留 Detach 路径 |
| 明确不变 | schema/注册ID `ecommerceLayout`、UI、公共 JSON、A01/A11/F1/G-02 实现、包 metadata 0.3.6、冻结 Agent architecture |

实际 schema **没有 Detach action，也没有 Detach 按钮**。`runRegisteredToolAction("ecommerceLayout", "detachSelectedComponent", "{}")` 返回 `ok:false / Registered tool action not found.`。用户裁定：**“仅修保留 Host 函数，注册与 UI 留待后续”**。因此本轮组合为真实注册 Create/Refresh/Remove 与直接调用实际保留 Host Detach；不宣称完成“真实注册 Detach”链。A0 的候选规划保持历史原文，本报告记录核实后的差异。

原来源 [A0 A08](vela-0.3.12-a0-baseline-reconciliation.md)、[source-audit A08](audit-baseline-0.3.11/source-audit.md) 的 `HOST-DETACH-SOURCE-COMMENT` 只是 E1 摘录变更循环，原生 Undo 未测。本轮未执行旧摘录冒充生产测试。指导边界见 [R1 A08](../design/vela-0.3-reconstruction-guidance.md)。

## 实际调用链、数据归属与写入点

- [schema](../../host/tools/adComponentKit.tool.jsx) 的 `createIconGrid` / `createFeatureStack` → 实际工具实现 → `setLayerArtifactMetadata`。完整 Host [加载 harness](../../scripts/fixtures/host-json-entry-harness.js) 展开实际 includes，并通过真实文件加载 registry；没有复制任何生产函数。
- `createFeatureStack` 的三个 comment 写入点分别为 controller、文本 `sourceLayerBinding`、背景 `generatedLayer`；`createIconGrid` 的两个点为源层 `sourceLayerBinding` 和 controller。`createController` 先写旧式 controller metadata，再由上述创建入口写 artifact metadata。`bindFeatureTextPositionToController` 中同名 role 是**表达式签名**，不是 comment 恢复信息写入点。
- Refresh 的 `refreshFeatureStack` / Grid 路径不重新写 source comment metadata。本轮经真实注册 Refresh 对照保存信息未变。Grid 的 `shouldSkipGridLayer` 会拒绝已有 metadata 的再次创建；Feature Stack 可再次创建/绑定，测试以其真实写入路径证明保留最早的恢复信息。
- 新式 `LOMOND_CABINET_ARTIFACT_V1:` 由 `parseArtifactMetadata` 使用公共严格解析器识别，要求 `tool === "adComponentKit"` 与 artifactId，componentId 可回落至 artifactId，componentType 可回落至 kind。owner 文本本身不是额外鉴权。`componentLayers` 原本只按 componentId 汇总，本轮不全局修改它。
- Detach 在汇总后额外约束：新式目标只处理同 artifactId 的新式成员；旧式目标要求 `aetoolbox === true`、无 artifactId、无其他 tool 声明，仅处理同 componentId/componentType 的旧式成员。其他 artifact、另一组件、不再有 metadata 的用户 comment 不写入。旧格式没有独立 artifactId，不能凭空提供新格式的身份强度。
- `sourceLayerBinding` 与 Refresh 已识别的旧 `itemText` 必须有可解码恢复字段。controller/generatedLayer/helperLayer/item/itemBg/icon 只清归属 metadata；未知 role 或组件类型冲突在写入前拒绝。旧样本是按现有识别约定构造的兼容夹具，**不是已取得的历史 AE 工程样本**。

## 修复前反例与最小修复

[before.json](vela-0.3.12-b2-a08-offline/before.json) 保存生产 SHA、命令、真实注册创建返回、创建前/Detach 前/Detach 后层身份、comment 和 UTF-16 code unit、parent、变换、写入/删除记录与实际返回。

源层原注释含中日文、emoji、换行、引号、反斜线、百分号、字面量转义及前后空白。真实 `createIconGrid` 已保存 `previousCommentEncoded`；原 Detach 将 source、controller、构造 generated 的 comment 全部清空并返回 `ok:true`，无关层/另一组件不变。初版采集的 `expression` 是替身的诊断哨兵字段，不是 AE Property.expression 实机证据；后续 focused 直接对实际工具使用的变换 property 表达式进行对照。

[after.json](vela-0.3.12-b2-a08-offline/after.json) 使用相同生产创建路径：源层原文精确恢复，controller/generated metadata 清空，所有图层保留，无 remove 调用。不同运行生成的 artifactId/时间不是稳定预期字段，比较以各次创建返回的身份为准。

| 情况 | 本次处理 |
|---|---|
| 新建源层，原注释非空或明确为空 | 直接读取真实 string，`encodeURIComponent` 一次，显式保存 `previousCommentEncoded`，包含 `""` |
| 已有 source/itemText 恢复信息 | 严格检查可解码后保留原编码文本；不覆盖为 metadata 的编码，不重复编码 |
| 读取失败、非 string 原 comment、编码失败、源 metadata 写入失败 | 不吞成空串，沿现有创建入口错误通路返回失败；创建本身可能已改控制器/布局，未新增创建事务回滚 |
| 恢复字段缺失 | 拒绝 Detach，保留 metadata。旧 writer 在空 comment 和读取失败时都会省略该字段，无法证明原值必为空 |
| 恢复字段显式 `""` | 合法，恢复确切空注释 |
| `null`、数值、布尔、对象等错误类型 | 拒绝，不经 `String(...)` 强制转为空或文本 |
| 损坏百分号/UTF-8 编码 | `decodeURIComponent` 失败则拒绝，不复用将异常吞为空的 `decodeText` |
| 合法特殊文本 | 按既有 URI 格式只解码一次；不 trim、解析或重写用户注释 |
| 用户覆盖了 binding comment | 不再凭旧身份猜回源注释，不改其 comment/parent；Detach 可处理仍明确归属的其他层 |

Detach 先完成成员归属、全部恢复字段、parent 的读取和检查，再开始 Undo group。parent 只在其对象同样位于目标归属集合时设为 null，外部 parent 保留；不恢复未保存的历史 parent，不做几何烘焙或布局重算。AE 解除 parent 自身可能保持视觉位置/改变本地属性，其真实行为需实机核验，VM 不模拟这一点。

执行时再次对照 comment/parent 基线；先解除该层拥有的 parent，再写恢复后的 comment。控制器 metadata 放到最后处理。错误结果记录已完成层数及已确认写入数，并明确失败写入本身也可能产生变更、未执行回滚；不是完整成功、不是原子事务。`finally` 结束 Undo group。第二次对已解除控制器操作明确失败，不再次清空恢复后的用户注释。

未调用 Remove 全流程或其恢复辅助，未扫描/删除任何表达式。`restoreSourceLayerBinding` / `decodeText` / `restoreOrClearArtifactExpressions` 的 Remove 行为保持原样；正常注册 Remove 仍恢复源注释并删除 controller。Remove 对损坏恢复数据的既有宽松行为是相关风险，**未在本轮修复或宣称已安全**。

## 离线验证与替身边界

| 命令 | 本轮实际结果 | 原始结果 |
|---|---|---|
| `node scripts/test-ad-component-detach.js docs/reports/vela-0.3.12-b2-a08-offline/focused-records.json` | 251 assertions PASS | [保留摘要；focused.txt原件已本地归档](vela-0.3.12-b2-a08-offline/index.json)、[保留摘要；逐次 Detach 记录原件已本地归档](vela-0.3.12-b2-a08-offline/index.json) |
| `node scripts/test-host-json-entry.js` | 1122 PASS | [保留摘要；related.txt原件已本地归档](vela-0.3.12-b2-a08-offline/index.json) |
| `node scripts/test-host-json-member-admission.js` | 224 PASS | 同上 |
| `node scripts/test-host-json-serialization.js` | 2307 PASS | 同上 |
| `node scripts/test-host-registry-transaction.js` | 27 PASS | 同上 |
| `node scripts/test-grid-host-contract.js` | 120 PASS | 同上 |
| `node scripts/test-grid-refresh-idempotence.js` | 106 PASS | 同上 |
| `node scripts/run-all-tests.js` | 最终生产/测试状态仅运行一次，186/186 PASS，0 skipped | [保留摘要；offline.txt原件已本地归档](vela-0.3.12-b2-a08-offline/index.json) |

本次 A01/A11/F1 回归数是**本轮重新运行的离线结果**，不是重新进行 B1 实机验收；历史日志未覆盖。新 suite 按既有 `test-*.js` 发现机制自动纳入全量。`capture-a08-detach.js` 不是自动 suite，拒绝覆盖已有目标文件。

Focused 覆盖完整成功、预检拒绝、执行中失败：合法新旧样本、空/非空/特殊文本、缺失/null/错误类型/损坏编码、未知 role、类型冲突、用户改写 comment、另一 artifact/组件与无关层、源层/控制器读取失败、parent/comment 写入失败、前层已成功后中断与再试、控制器最后写入失败、两种创建/Refresh 路径、正常 Remove 对照。测试保存实际 `ok/message`，不是只检查 ok。

[A08 harness](../../scripts/fixtures/ad-component-detach-harness.js) 的 CompItem、图层集合、变换/效果/shape 属性、parent/comment getter/setter、remove 和 Undo group 是可控 Node 对象替身；comment/parent 故障会真实抛出到生产逻辑。局部字段数据和调用数可验证，无原生 AE 内部求值、坐标保持、Undo 栈效果、UI、CEP 桥接或真实图层 API 证据。Feature Stack shape 属性模型只承载数据和 API 调用，不能证明外观/表达式求值正确。旧测试 `test-grid-host-contract` 加载完整单工具文件但使用自己的 AEToolbox 替身，本轮主证据另用完整 Host/registry harness。

## 实施轮的有限实机验收准备（当时未执行）

1. 用户保存工作、正常重启 AE、确认 Extensions 映射到本工作树；从真实 CEP target 确认保留 Detach 与源 comment writer 实际装载。当前没有注册 Detach/UI：后续须另行明确授权通过 CEP 调用**保留 Host 函数**，或等待后续注册工作；不能用 `runRegisteredToolAction` 伪装已有入口。
2. 用户确认可丢弃工程、目标合成与测试源层，记录**创建前原注释基线**：层身份、名称、comment 原文/code unit、parent、相关属性；可用非空多语言特殊文本及明确空文本，不向日常工程注入损坏 metadata。
3. 通过现有工具页面真实 Create Icon Grid 绑定。读取并记录**Detach 前绑定基线**：源层 metadata 中保存原注释、控制器/生成层身份及 parent、相关变换和表达式。创建是准备动作，不混入被测读取/Detach 的计数。
4. 在另行明确的保留函数调用授权下，选中相应 controller，调用实际 `AEToolbox.tools.adComponentKit.detachSelectedComponent()`。保存原始 Host 返回和 CEP 解析；读取**Detach 后**同一批层：原注释逐 code unit 恢复、没有删除层、归属 parent 解除、外部/无关数据保留。另记录 AE 本地变换与视觉观察，不承诺几何烘焙。
5. 用户执行一次原生 Undo 并确认，读取**Undo 后**状态，应恢复到 **Detach 前绑定基线**，不是直接回到创建前。用户 UI/Undo 确认与 Host 读取分别记录；故障主要留离线，不为覆盖故障污染工程。不运行 Provider，不要求模型参与。

## 文档与交付检查

当前事实同步到 AGENTS、ROADMAP、PROJECT_STATE、HANDOFF、指导书 A08 与当前总账 A08；G-02 仅补 PR #204 合并关联，acceptance 对象不变。原审计、A0、B1 阶段报告及其证据未修改。没有新路线 ID 或平行长期事实源。

`node scripts/report-i18n-usage.js --check`、`node scripts/check-project-consistency.js`、新增 JS 与完整 JSX 语法检查、JSON/证据索引哈希/新增报告本地链接检查、已跟踪及逐个新增文件格式检查结果见 [保留摘要；checks.txt原件已本地归档](vela-0.3.12-b2-a08-offline/index.json)。i18n 生成报告保持 freshness，无新 UI 文案键，Host 错误沿既有英文 message 信封；不手工修改生成报告。

证据索引：[index.json](vela-0.3.12-b2-a08-offline/index.json)。本轮没有暂存、commit、push、PR、merge、tag 或分支操作。下一步为另行授权的有限真实 AE 验收，**不是自动进入 A09**。

## 有限真实 AE 验收暂停记录（2026-09-10，当时等待用户继续）

本次验收未重跑实施轮251 assertions/186 suites。实际 AE 26.3x87、CEP 12.0.1，通过从 `.debug` 重新发现的真实 Lomond Cabinet target 采集。保留 Detach 完整函数仅进行 CRLF→LF 与首尾空白归一化后，与工作树一致；真实 Create 注册目标已核对，私有 writer/辅助函数未单独导出或全文比较。

用户确认测试工程并同意后，在 `Vela Test.aep` 的 `A01_TOOL_SMOKE`（191）准备3个新源层和无关层，通过既有工具页面 Create Icon Grid 创建组件。特殊注释与确切空串的 B0 code unit 对照通过；创建后3个源层恢复字段实际存在且解码与B0相符，包括显式空字符串。Create 动作原始回调未截取，不补造；实际创建 metadata/层身份已读取。

用户随后要求离开电脑期间停在人工操作前。**当时尚未追加外部 parent/用户改写 comment 保护准备，尚未建立最终B1，未调用 Detach，未执行 Undo，Feature Stack 未开始。** 不重复创建现有Grid。回来后从保护准备和B1继续；A08保持 REAL AE ACCEPTANCE PENDING，不能认定本组或全部实机通过。

进度、用户原话、装载与各实际记录见 [保留摘要；暂停进度原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；装载比较原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；B0原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；创建后读取原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)。生产、实施测试及A08离线证据哈希与本次开始一致。

## 有限真实 AE 验收结果与停止点（2026-09-10）

采用用户已确认范围：**实际注册 Create UI ＋实际保留 Host Detach**。未增加注册或临时按钮；Detach没有通过runRegisteredToolAction伪装已有入口。用户确认可丢弃测试工程后才准备新增层，未修改此前测试资产数据、保存/关闭工程或运行Provider。

| 组 | 结果 | 证据 |
|---|---|---|
| A08-AE-01 装载/入口 | PASS | [保留摘要；真实环境与完整函数原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；源码比对原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json) |
| A08-AE-02 Icon Grid | PASS，包含一次干净R2 Undo回验 | [保留摘要；B0原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；B1原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；原始Detach回调原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；B2与82项对照原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[R2 Undo](vela-0.3.12-b2-a08-real-ae/grid-r2-undo-confirmed.json) |
| A08-AE-03 Feature Stack | **FAIL**，Undo恢复不抹掉失败 | [保留摘要；B0原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；B1原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[原始Detach回调](vela-0.3.12-b2-a08-real-ae/feature-detach-action.json)、[保留摘要；B2原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[保留摘要；153项对照原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)、[B3/用户恢复确认](vela-0.3.12-b2-a08-real-ae/feature-undo-confirmed.json) |

### 实际环境与采集方法

AE **26.3x87**，CEP **12.0.1 / Chromium 99**。从.debug的8088重新发现target **728E58B96CDC21C1721F38045B6D1B9D**，实际页面是Extensions下的Lomond Cabinet client/index.html；Extensions junction指向本工作树。保留Detach完整函数仅作CRLF→LF及首尾空白归一化后匹配；未删除内部空白/注释、未改字符串或仅凭关键字判定。私有writer与恢复辅助无法单独toString，未额外export或声称私有源码全文匹配。

内置浏览器控制工具连接报错，改用实际CEP DevTools WebSocket的Runtime.evaluate→页面CSInterface.evalScript；Node仅传输/保存真实回调和派生对照，未用VM替代Host。初次主页导航的click/指针尝试没有打开工具，用户随后打开工具；这些导航记录不算生产失败。两次Create通过既有工具页面按钮与原事件处理器执行，未截取Create动作原始回调，保持UNKNOWN；真实创建出的新artifact metadata与层身份均已独立读取。三个Detach动作（Grid两次、Feature一次）都保存了动作自身原始回调，无重编码后冒充原回调。

每个Host采集JSON内保存实际命令、原始返回、CEP解析及target信息。用户确认文件明确标注对话来源，不冒充Host trace或截图。没有VM式真实写入计数。

### Grid旅程与首次Undo干扰

合成A01_TOOL_SMOKE（191）、time=0。源层206/207/208，对照层210，控制器212；实际artifactId为ack_20260910_122851_618743。B0非空特殊注释与确切空串经独立code unit对照通过；真实writer保存了字段存在且值为""的空恢复信息。

授权准备阶段将206的parent改为组件外对照210，将208的binding comment改为普通用户文本，并在210的旋转上设置无归属表达式value；此后重新建立B1。Detach恢复206原注释并保留外部parent，恢复207空注释并解除内部parent，保留208当前用户comment与parent，清控制器metadata但不删层，旧资产203与其他对照不变。208没有被计作“成功恢复原注释”。82项后置字段检查通过；207本地Position因解除parent变化，作为读数保存，未要求其与B1相等。用户确认无异常跳位。

第一次用户Undo后报告为获取图层名干扰了撤销队列。只读结果虽与B1一致，仍保留为[受干扰过程](vela-0.3.12-b2-a08-real-ae/grid-undo-user-contamination.json)，**不作为干净一次Undo证明**。确认完整B1后有依据地补一次受保护Detach，R2后置快照与首次B2一致；用户仅按一次Ctrl+Z并确认“已撤销，变化如预期”，[保留摘要；R2 B3原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)与B1无差异。没有盲目连续Undo或手工补写恢复。

### Feature失败事实与归因边界

源文本213、控制器217、生成背景218、对照215；artifactId为ack_20260910_142239_903961。UI实际为left/fixed，控制器Text Align=0、Fixed Width=442，生产映射0为左对齐；用户先条件性确认左对齐正确，核实模式后明确确认“Feature 画面正常”。B1存在5个工具生成表达式和2个对照表达式，读到的expressionError均为空。

Detach返回ok:true，源注释逐code unit恢复，源/控制器/背景保留，内部parent解除，其他组件和无关字段保持；153项派生检查中152通过、1失败。失败项为**出现5处新的expressionError**：源文本位置；背景位置、矩形大小、圆度、填充颜色。错误均报告无父级时无法使用.parent。表达式原文和读到的expressionEnabled仍为true且前后相同；不能因错误文本写“表达式被禁用”就伪造enabled=false。

[完整表达式前后与错误](vela-0.3.12-b2-a08-real-ae/feature-expression-failure.json)证明：未清表达式并不等于其求值语义受保护。保留表达式中读取parent/thisLayer.parent，Detach解除这些关系后在真实AE报错。当前失败与这一依赖相符，**没有继续追查引擎内部机制**。原Detach在静态源码中也会解除parent，因此本轮未证明错误由注释恢复修复新引入；未做修复前实机重演。这不构成验收豁免，也不转归A09。

用户随后仅执行一次原生Undo并确认“撤销后表达式恢复正常”。B3在预先约定数值绝对误差1e-6及文本/身份/parent/表达式严格对照下，与B1无差异。该确认只明确表达式恢复，不补造独立的Undo后截图/视觉确认。**恢复能力通过，Feature Detach仍FAIL。**

### 剩余覆盖、检查与下一步

- 本轮只检查静态time=0的有限字段和用户视觉。没有动态烘焙、创建前历史parent恢复、全部AE属性或表达式求值矩阵。
- Feature扩展快照中19个空ADBE Effect Mask Parade分组没有valueAtTime；采集器捕获该读取限制，B1/B2均记录，未作为19个产品失败，也未伪造值。可读取的变换、向量及效果叶子值、表达式文本/开关/错误独立保存。
- 缺失/损坏恢复信息、setter部分失败及旧式构造样本仍只属实施轮离线；Remove宽松解码风险保持待复核，本轮未调用Remove。
- 实施轮251 assertions和186/186 suites保留原结果，**本轮未重跑离线**。[保留摘要；完整性原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)确认345个保护文件未变，包含生产、实施测试、冻结architecture和A08原离线证据。仅新增实机证据、报告与A08当前状态文档；B1历史报告/acceptance未变。
- [汇总](vela-0.3.12-b2-a08-real-ae/summary.json)、[证据索引](vela-0.3.12-b2-a08-real-ae/index.json)及[保留摘要；文档检查原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)记录本轮交付；没有Git写操作、Provider、保存/关闭工程或资产清理。

停止在**Feature Stack Detach表达式正确性阻塞**。需要下一轮先裁定工具拥有的表达式在Detach中的处置契约，再另行授权最小修复和离线/真实回验；本轮不增加表达式清理、不修改生产、不进入A09。A08不TARGETED_ACCEPTED，不READY FOR COMMIT / PR；INTEGRATED_ACCEPTED / CLOSED仍留待0.3.12-G，整个B2/0.3.12未完成。

## A08-F1：当前帧定稿与工具表达式依赖解除（2026-09-10）

### 新契约、基线与历史归属

用户现在明确选择：保留操作时当前帧的生成造型，允许工具驱动转为静态属性；不保留整段工具动画、不做全时间轴烘焙。该授权放开初始A08对工具表达式的限制，不放开任意表达式清理、Remove、A09或Detach注册/UI。

仍在 `fix/ad-component-detach-a08-0.3.12`；HEAD与本地origin/dev均为 `d7dd7356cccbb637ae01a7e9d0629b9bc184a388`。沿用既有未提交A08工作树，没有fetch、切分支或Git写操作。当前HEAD是G-02合并基线，不是尚未创建的A08/F1修复提交。

读取[原Feature五处失败](vela-0.3.12-b2-a08-real-ae/feature-expression-failure.json)及B1属性形状后实施；未重演真实失败。原Grid PASS、Feature FAIL、返回ok:true却出现5处expressionError，以及用户Undo/B1恢复都保持历史事实；F1离线通过没有将它们改为实机通过。

### 最小生产改动与支持范围

生产仅继续修改 `host/tools/adComponentKit.jsx`。`featureTextPositionExpression` 和 `featurePillExpressions` 从既有writer提取完整模板供创建/刷新与Detach共同使用。没有复制一套模板判断后再宽松清理；[保留摘要；前后完整模块兼容对照原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json)核对Create/Refresh五个表达式及正常Create/Refresh/Remove结果一致。只归一化每次运行生成的artifactId签名行与结果artifactId字段，未归一化表达式正文；[保留摘要；实际采集命令原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json)明确使用捕获的完整F1前模块和当前完整Host模块。该对照是VM生产模块证据，不是AE执行。

`detachFeaturePlan` 在初始A08成员归属和注释恢复预检之后执行，`verifyDetachValue`负责写入后的读回。公开签名、注册ID、JSON信封、源注释writer/严格恢复保留；Remove实现与调用路径不修改，未调用它的restore-or-clear流程。

| 对象/属性 | 准入与处置 |
|---|---|
| sourceLayerBinding / Position | 完整签名、artifactId、kind、role、空历史表达式及完整模板匹配；解析模板中的字面量引用表，不执行它；引用必须唯一解析到本artifact源层，itemIndex对应当前源层，parent为目标controller |
| generatedLayer / Position、Rect Size、Roundness、Fill Color | 精确属性路径及完整已知模板，背景→源文本→目标controller归属链成立；五类属性均采样后转静态 |
| controller参数 | 同一t读取Gap、Padding X/Y、Fixed Width、Text Align、Pill Width Mode、Corner Radius、Fill Color，检查求值错误及数值；允许其动画/表达式作为采样来源，不删除控制器参数关键帧或驱动 |
| 待写属性冲突 | 非零numKeys、分离维度、不可写、禁用/改写/未知模板、签名不符、非空历史表达式或不支持的历史开关均预检拒绝；不恢复旧表达式替代当前画面，不丢弃恢复字段 |
| 其他属性 | 只读检查成员属性树；未知的活跃表达式若在待解除parent层上，则无法证明依赖安全，预检拒绝；其他位置的本artifact工具绑定也拒绝。该扫描只作拒绝保护，绝不批量清除。未写属性关键帧保留；组件外表达式/图层完全不处理 |
| F1实施时的空间范围（类型判断已由F1a修正） | 当时要求普通2D、未锁定、非collapseTransformation；父链在t为单位Scale、零Rotation及中性Z。Position/Anchor允许2分量或实际AE记录的3分量且Z=0；Scale第三分量须100。非平移父链/3D/不可读空间在写入前拒绝，不实现通用A09转换 |
| 外部parent/用户改写comment | 控制器外部parent保留，子层补偿包含外部平移祖先；Feature源层已换外部parent或背景依赖的源层已失去binding时，整次预检拒绝，保护现有数据。Grid沿用初始A08归属路径及外部parent/用户comment保护 |
| 旧格式 | 初始A08合法旧Grid恢复继续通过；无artifact签名的旧Feature表达式不能证明精确归属，本轮预检拒绝且保留metadata，不批量升级或清空旧工程 |

### 顺序、空间与失败边界

1. 固定一次实际 `comp.time` 为t，不改变用户时间。确认全部成员、恢复comment、具体表达式属性及依赖；用 `valueAtTime(t, false)` 取得表达式求值结果，而非底层静态值。不可用读取、expressionError、非法维度/非有限数值、负尺寸/负圆度均拒绝，不回落到value。
2. 所有必要值和父链变换在任何表达式/parent/comment写入之前缓存。平移父链按 `offset(parent) = offset(ancestor) + sampledPosition(parent) - sampledAnchor(parent)` 合成；待解除层目标Position为自身已采样local Position加原父链offset，保留2D值的实际分量数。没有将旧local Position直接当无parent值写回。
3. 一个Undo group内先解除五类已识别工具表达式并写已采样静态值，然后使用 `setParentWithJump(null)` 解除内部parent，避免隐式变换补偿写入其他属性；显式写缓存的comp空间Position。工具依赖被拆掉以后不再采样旧结果。
4. 对实际写入值在同一t独立读回，确认expression为空、enabled=false、无错误，维度/有限性/数值与缓存目标相符。**F1实机复验前固定绝对误差：几何/位置1e-4 AE单位，颜色每通道1e-6**；不按失败结果调整。原历史Undo比较的1e-6不被重写。读回是有限属性对照，不等同整幅AE视觉证明。
5. 全部属性处理与读回通过后，才逐层恢复source comment/清理管理metadata；控制器最后收束。未删层、文字、形状或关键帧，没执行Remove。

预检拒绝不开始Undo group、无工程写入。执行中异常返回既有 `Detach incomplete`、已完成层/确认写入数与“失败写入可能已改变数据、no rollback”说明，finally结束group；不宣称原子回滚。属性/parent失败时管理metadata尚未清除；comment阶段失败可能已有部分恢复，准确保持部分完成结果。已部分定稿后再次执行可能因模板不再完整而预检拒绝，不能将重试当作自动恢复；真实恢复能力仍需用户原生Undo验证。

### 本轮测试与原始结果

新增 `scripts/test-ad-component-detach-finalize.js`，由既有 `run-all-tests.js` 自动发现；继续使用A01完整Host/registry加载器及A08工具harness。测试不复制Detach或生产表达式处理算法。harness补充真实属性路径/枚举形状、持久控制器效果属性、显式模拟求值、parent无补偿边界及故障；没有配置模拟求值时会抛错，不默认返回“预期成功值”。

| 实际命令/证据 | 本轮结果 |
|---|---|
| `node scripts/test-ad-component-detach-finalize.js …/focused-final-records.json`：[保留摘要；日志原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json)、[保留摘要；逐例记录原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json) | 421 assertions PASS；69次Detach记录：5完整成功、58预检拒绝、6准确执行中失败，均符合各自预期，不把负向ok:false算产品失败 |
| `node scripts/test-ad-component-detach.js`：[保留摘要；日志原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json) | 重新执行251 assertions PASS；Feature旧“表达式原文不变”断言按F1新契约调整，原251项历史日志不修改 |
| [保留摘要；相关回归命令/输出原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json) | A01 1122、成员名准入224、serializer2307、registry27、Grid contract120、Grid refresh106 assertions PASS；最终全量又在同一最终代码上覆盖这些suite |
| `node scripts/run-all-tests.js`：[保留摘要；完整输出原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json) | **187 discovered / 187 executed / 187 PASS / 0 FAIL / 0 skip**；最终生产/测试状态执行一次，不沿用初始186结果 |
| [检查与证据索引](vela-0.3.12-b2-a08-f1-offline/index.json)、[保留摘要；检查输出原件已本地归档](vela-0.3.12-b2-a08-f1-offline/index.json) | i18n freshness、项目一致性、语法、JSON/链接、历史完整性与已跟踪/新增文件格式检查 |

测试覆盖t=2.5与7.25、控制器动态采样、采样先于变更、五类属性与嵌套父级平移、真实AE快照中的2D三分量形状、固定容差、原注释/外部parent/未写关键帧/无归属表达式保护、模板和恢复历史冲突、求值/维度/写入/parent/metadata/读回故障，以及实际Create/Refresh/Remove和Grid回归。

模拟求值函数返回有意不同于底层值的合成数据；没有实现AE表达式引擎，`setParentWithJump`只模拟“关系改变而本地属性不变”。这些证据证明生产逻辑消费求值、顺序、归属和数值计算，不证明原生AE求值、渲染、空间接口或Undo已经通过。早期开发输出 `focused-records.json` / `focused.txt` 与早期模板对照保持原样，最终结果以上表的final文件为准。

### 有限真实复验准备与停止点

本轮没有连接真实CEP/AE、执行Provider或操作工程/选择/Undo。后续正常重启AE后重新发现target，核对保留Detach完整函数装载并结合真实行为核对私有辅助；不临时覆盖函数。

- 原失败Feature旅程：在可丢弃工程确认原B1绑定状态或经真实Create形成同等场景；先保存当前t下的五类求值、源/控制器/背景身份、parent、comment、表达式、相关变换与画面。执行一次保留Host Detach，读回五类静态值及comp空间位置，确认画面无跳变、无新错误、原注释恢复且层保留。用户原生Undo后对照**Detach前B1**，不要求回到创建前。
- 非零时间：通过既有测试准备设置一个控制器参数的两时刻不同值，在非零t停留后建立独立B1；执行仍只定稿该t，检查实际采用该时刻结果，时间未改变，控制器动画及其他用户关键帧仍在。准备写入与Detach分组，Undo只撤销Detach。不得逐帧烘焙或将边界夹具灌入日常工程。
- Grid小范围：复用无工具表达式的原注释/外部parent保护场景，核对一次Detach/Undo，避免重跑全部旧矩阵。预检故障/部分setter失败主要留在离线，不向实机注入损坏metadata。

停止在 **F1 IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。A08整体未TARGETED_ACCEPTED，尚不能READY FOR COMMIT / PR；INTEGRATED_ACCEPTED / CLOSED留待0.3.12-G。未新增原始问题ID、未推进A09/B2封存、未暂存/commit/push/PR/merge/tag。

## A08-F1有限真实AE复验：普通Feature准入拒绝（2026-09-10）

**结论：REAL AE REVALIDATION FAIL；A08未TARGETED_ACCEPTED，也未READY FOR COMMIT / PR。** 新代码已实际装载，但正常Feature在预检被拒绝，没有完成当前帧定稿。没有把拒绝接受成新的宿主支持限制，没有现场修复或继续后续组。

| 必需组 | 本轮结果 | 证据 |
|---|---|---|
| F1-AE-01 新装载/对象 | PASS | [保留摘要；环境与实际完整函数原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)、[保留摘要；全文比对原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)、[保留摘要；当前工程/成员原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json) |
| F1-AE-02 正常Feature | **FAIL：预检拒绝，无成功定稿旅程** | [动作原始回调](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-detach-action.json)、[实际属性标志](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-flags.json)、[拒绝后独立对照](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-comparison.json) |
| F1-AE-03 非零时间 | NOT COVERED | 前组失败后停止；未准备控制器关键帧、未新建或延长合成 |
| F1-AE-04 Grid回验 | NOT COVERED | 前组失败后停止；原Grid保持绑定，历史PASS未当作本轮PASS |

合计 **4组：1 PASS / 1 FAIL / 2 NOT COVERED**。仅调用1次实际保留Detach，0次成功定稿、0次原生Undo。正常预检返回ok:false本身没有误报成功，但阻止了要求交付的普通2D Feature旅程，因此不能将其算作成功验收。

### 新环境、B1与用户画面

从`.debug`的8088重新发现真实Lomond Cabinet target `DCC2135961049894C94B59A8C3E388D7`，没有沿用旧target。AE 26.3x87，实际CSInterface Host环境AEFT 26.3；Extensions junction继续指向本工作区。Host load info无注册加载错误。实际 `detachSelectedComponent.toString()` 与工作树全文仅作CRLF→LF、外侧trim后匹配；工作树声明提取时去掉赋值和末尾分号，函数正文未归一化关键字或内部空白。私有helper没有新增export、未独立全文比对，只记录正常装载与实际行为。

当前测试工程仍为 `D:\Projects\Vela Test\Vela Test.aep`，合成191 `A01_TOOL_SMOKE`，唯一选中controller217；source213、generated218的artifactId仍为 `ack_20260910_142239_903961`，均由本轮只读结果重新确认。time=0，duration=frameDuration=0.03333333333333，即1帧。原Grid控制器212及源层/保护关系也仍在。没有更改工程、选择或布局以适配预期。

[保留摘要；B1原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)记录五类求值、底层值、完整表达式/开关/错误、comment/code unit、parent、属性关键帧及相关变换；原left/fixed模式保持，Fixed Width=442，Text Align=0，Corner Radius=28。五个待定稿属性均无关键帧/表达式错误；源和父链Scale=100/100/100、Rotation=0。源注释预期来自原真实创建前的[保留摘要；Feature B0原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)，[保留摘要；本轮对照原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)确认恢复字段与独立原文一致。

自动AE截图两次失败：`SetIsBorderRequired failed: 不支持此接口 (0x80004002)`，不是产品错误。[保留摘要；用户提供的B1截图原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)按原字节保存；用户明确回复[保留摘要；“Feature 画面正常”原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)。未将工具截图失败转为虚构图片，也没有B2无跳变或Undo用户确认。

### 实际失败点与独立后置观察

调用前以本轮B1的工程/合成/time、唯一controller、artifact comment及成员parent作只读保护，然后直接返回真实保留函数的结果，无额外Undo group。CSInterface原始回调为：

```json
{"ok":false,"message":"Detach preflight failed; no changes made: Error: Feature Detach: A08_FEATURE_SOURCE unsupported/locked layer"}
```

本轮实际读到：

| 层 | locked | threeDLayer | collapseTransformation | canSetCollapseTransformation |
|---|---|---|---|---|
| controller217 / AV | false | false | false | true |
| source213 / Text | false | false | true | false |
| generated218 / Vector | false | false | true | false |

返回与工作树 `detachFeaturePlan` 的 `layer.locked || layer.threeDLayer || layer.collapseTransformation` 检查对应：源文本的后一个条件触发拒绝。背景若到达同一条件也会满足它，这是基于源码和实际标志的推断，不冒充第二次执行结果。当前这两类普通2D层返回不可切换的true标志，不能仅按可切换预合成的Collapse Transformations语义概括；本轮没有进一步追查引擎，也不宣称所有版本/所有Text与Shape必然相同。

[保留摘要；独立B2原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)与B1比较：文本/身份严格、数值绝对误差1e-6，**记录字段无差异**。五个工具表达式、绑定metadata、comment、parent、图层和时间仍在。观察快照包含实际 `sourcePointToComp` 在未变time下的返回，与局部属性读数分开；没有注入表达式测坐标、没有使用生产verify结果替代后置观察。由于没有成功定稿，本轮不产生跨解绑空间/静态属性保持的PASS结论。

函数返回是预检失败，独立字段也未变，因此没有让用户执行一次可能撤销其他准备的Undo；这不是Undo恢复通过，也不是AE全工程写入计数证明。未重试Detach、未改任何表达式或标志，没有通过新建夹具隐藏本次正常场景拒绝。

### 剩余工作、完整性与停止

后续需另行授权修正普通Text/Shape固定标志与可切换预合成collapse的准入区分，并补足harness真实默认标志；继续保留当前帧契约、精确表达式归属和既定容差。不能通过改写标志、删除用户属性、拒绝全部Feature或归入A09来豁免。完成修复后再重新装载，接续正常Feature、非零时间及Grid有限复验。

非零时间组另有已查明的准备条件：原合成只有1帧。若后续恢复执行，需要用户确认新的足够时长测试合成；本轮没有延长原合成、图层范围或新建资产。

[本轮汇总](vela-0.3.12-b2-a08-f1-real-ae/summary.json)、[证据索引](vela-0.3.12-b2-a08-f1-real-ae/index.json)和[保留摘要；检查输出原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)保留结果。421/251 assertions、187/187 suites仍是F1实施轮，**本轮没有重跑**。生产、实施测试、原63份历史证据与F1离线日志以本轮前后哈希核对；原Feature FAIL、Grid PASS和旧Undo保持原字节。

只追加实机证据与A08当前状态文档。未调用Remove或Provider，未修改注册/UI/生产/测试，未保存、关闭、清理工程，未执行Git写操作，不进入A09。停止在上述具体准入阻塞；没有新的验收接受裁定。

## A08-F1a：Text/Shape 类型感知准入修正（2026-09-10）

**F1a IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING。** A08整体未TARGETED_ACCEPTED，不进入READY FOR COMMIT / PR。本轮未连接AE/CEP、未执行Detach/Undo、未要求重启；生产组合运行均在隔离VM中。

### 实际依据、基线与修复前反例

沿用当前未提交工作树，分支仍为 `fix/ad-component-detach-a08-0.3.12`，HEAD/本地origin/dev仍为 `d7dd7356cccbb637ae01a7e9d0629b9bc184a388`，未fetch。保留已有A08/F1实现、报告和证据；HEAD仍是G-02合并基线，不是新修复提交。

依据上一轮[实际标志](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-flags.json)、[保留摘要；独立B1原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)及[保留摘要；独立B2原件已本地归档](vela-0.3.12-b2-a08-f1-real-ae/summary.json)：源Text/生成Vector均未锁定、2D，collapse=true、canSet=false。只有源Text实际触发拒绝；背景同条件是后续推断，未在实机执行第二次。本轮不重演失败，不执行Undo。

旧harness的差距并非“所有类型一样”：已有Text/Vector/AV的matchName区分，Shape的可选continuouslyRasterize默认true而Text默认false；但collapse默认均false、canSet和layer.source缺失，addNull仍使用普通AV而nullLayer=false。CompItem只有合成对象模型，没有图层来源区分。见[原factory观察](vela-0.3.12-b2-a08-f1a-offline/harness-gap.json)。这些缺口使旧421项通过无法证明真实Text/Shape标志可准入。

先只修改对应factory：Text/Shape默认true/false、addNull使用null类型，并增加仅在AE替身边界的CompItem/FootageItem来源、读取故障及标志写入监测。Text/Shape标志来自上述实机；FootageItem/预合成来源是本轮显式离线模型，不声称已取得这些素材的实机样本。原可选continuouslyRasterize模型没有当作本轮实机读数。

在生产未修改时，经真实注册 `createFeatureStack` 写入完整metadata/表达式，然后调用实际保留Detach：[保留摘要；before.json原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)返回 `ok:false`，原因 `Feature Detach: source0 unsupported/locked layer`。同一运行前后层/属性/标志相等；替身事件中除采样外0条，无Undo开始。记录包含实际生产SHA、加载模块、创建返回、原文/code unit、属性、parent及事件。[保留摘要；采集命令存档原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)不是生产函数复制品。

修改后的同组合[保留摘要；after.json原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)返回 `ok:true`，恢复原注释并解除五类工具依赖、完成原空间补偿，Text/Shape仍保持true/false。不同运行artifactId来自各次实际创建，不将其当固定输入；成功内容的明确预期由定向suite核对。

### 类型准入与改动边界

仅在 `detachFeaturePlan` 内增加 `admitLayerSpace`，替换成员和 `translation` 父链的两处通用collapse拒绝。复用现有 `classifyGridLayer` 的Host matchName判断，该classifier及其他Grid专属检查不改。AV再依据实际 `source instanceof CompItem`、`nullLayer`、`source instanceof FootageItem` 区分来源；名称、metadata role、canSet=false都不能独立授予类型准入。

| 类型/条件 | F1a当前行为 |
|---|---|
| 明确Text/Shape，必要标志可读 | 固有collapse=true / canSet=false不单独拒绝；同样继续检查locked、3D、模板/属性冲突、采样和空间条件，不写标志。其他可读boolean组合不作类型证明，也不新增不必要的组合限制 |
| AV且来源CompItem | 非collapsed时可继续其他平移空间检查；collapse=true明确拒绝，即使canSet=false |
| AV且已知nullLayer或FootageItem来源 | 普通未collapse路径继续；collapse=true或可选continuouslyRasterize=true拒绝；canSet=false不能覆盖此拒绝 |
| 未识别matchName、非null且未知AV来源 | 明确拒绝，不依据role/名称放行 |
| threeD/collapse/canSet不可读、缺失或非boolean | 明确预检失败；AV来源/nullLayer读取异常亦失败。continuouslyRasterize是既有可选启发属性，缺失允许，但读取异常/存在且非boolean仍拒绝 |
| locked、3D、非平移、既有冲突 | 待处理成员locked及3D拒绝；父链3D/非单位Scale/非零Rotation等继续拒绝。未写入的外部父层锁定状态不新增限制，保留既有语义 |

新增提示仍通过原 `ok/message` 信封，区分locked、3D、未知类型、不可读标志、collapsed precomp及rasterized AV。没有新增错误协议或i18n键，沿现有英文诊断机制。

局部[保留摘要；生产差异原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)及[保留摘要；范围核对原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)证明：除一个局部准入函数和两处调用，F1a前后生产其余内容相同。未改采样/缓存/空间公式、五类属性路径、完整模板、容差、写入顺序、注释恢复或部分失败语义。未修改Remove、公共JSON、注册/UI、Agent架构或包版本；未新建原始问题ID。

### 本轮测试、原始结果与替身边界

扩展既有 `test-ad-component-detach-finalize.js`，由原测试发现机制继续发现，没有新增suite。完整实际Host/registry加载，实际注册Create生成有效metadata/模板；测试不复制Detach、类型准入或补偿函数，不新增生产export。

| 本轮命令 | 实际结果/记录 |
|---|---|
| `node scripts/test-ad-component-detach-finalize.js docs/reports/vela-0.3.12-b2-a08-f1a-offline/focused.json` | **1134 assertions PASS**；[保留摘要；逐例记录原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)、[保留摘要；原始输出原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json) |
| `node scripts/test-ad-component-detach.js` | **251 assertions PASS，本轮重新执行** |
| Host registry / Grid contract / Grid Refresh | **27 / 120 / 106 assertions PASS** |
| 公共Host JSON入口 / NUL成员准入 / serializer | **1122 / 224 / 2307 assertions PASS**；以上相关命令和输出见[保留摘要；related.txt原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json) |
| `node scripts/run-all-tests.js` | 最终生产/测试状态执行一次：**187 discovered / 187 executed / 187 PASS / 0 FAIL / 0 skip**；[保留摘要；原始全量输出原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json) |
| 语法、i18n freshness、一致性、JSON/链接/格式 | [保留摘要；checks.txt原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)；生成i18n报告由原脚本验证，无手工修改 |

首次链接检查早于自身 `checks.txt` 落盘，报该目标尚不存在；这是采集脚本的产物生成顺序问题，[保留摘要；初次检查输出原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)保留。调整输出顺序后只接续JSON/链接/格式检查，复用已通过的语法、freshness、一致性及完整性结果，没有重跑离线suite或改生产/测试。

focused记录141次Detach：11个预期成功、124个预期预检拒绝、6个预期执行中失败，均按相应契约通过；它们不是124个产品失败。其中72个F1a标签覆盖真实默认成员及Text/Shape/AV/非collapsed预合成平移父链、locked/3D/非平移、collapsed预合成、canSet=false不能绕过、未知/不可读/非boolean标志与来源。负向断言核对具体类型/空间错误原因，使用有效创建metadata，未将更早metadata拒绝算作类型边界覆盖。每次记录均检查类型/标志未变，且无标志赋值事件。

原F1统一非零t采样、动画控制器当前求值、五类属性、源/背景comp空间补偿、同属性关键帧/历史用户表达式保护、采样零写入、执行中准确部分失败及固定容差均继续通过。原A08/Grid非空/空注释、用户改写comment/外部parent保护及正常Create/Refresh/Remove对照继续通过。Remove正常对照不等于损坏恢复信息下的安全性证明，其宽松解码风险保持未解决。

求值函数、FootageItem/CompItem及parent行为均是测试边界模型，明确配置求值；未配置时抛错，未模拟完整AE表达式引擎或渲染。VM写入/Undo group事件只用于离线顺序和失败核对，**不是实机视觉保持、原生Undo或任意空间支持的证明**。

### 历史保护、当前状态与后续实机

[保留摘要；完整性记录原件已本地归档](vela-0.3.12-b2-a08-f1a-offline/summary.json)核对100份既有A08/F1离线和实机文件原字节未变，包含原63份历史证据、F1离线及F1实机记录。原421/251与187 suites属于F1实施轮；本轮1134/251和新187 suites分别保存，未覆盖旧日志。第一次Feature五处表达式FAIL、F1普通Feature预检FAIL、Grid历史PASS及全部Undo证据保持当时结果。

总账仅A08根当前状态和新增f1a子记录更新；原implementation/targeted_validation/f1对象保持历史。五个当前入口同步F1a等待复验，未将任何其他原始ID改状态，B2/0.3.12未完成。

下一轮另行授权后，正常重启/装载新Host再按既有有限方案接续：

1. 重新发现真实CEP target并确认实际装载；F1a新增逻辑位于私有闭包，不能只用公开Detach函数旧正文相等来证明私有新代码已装载，须结合正常装载来源及真实Text/Shape通过行为；不临时覆盖函数。
2. 原普通Feature保持实际left/fixed配置，独立B1→一次真实保留Detach→B2，五类属性/注释/空间按原固定容差及用户画面核对，再由用户一次Undo比对B1。
3. 非零时间旅程：已知旧合成只有1帧，需要用户确认时长足够的新测试合成；不擅自延长旧资产。按既定控制器参数动画及独立t采样方案，验证本帧定稿和Undo。
4. Grid仅回验注释/外部parent/用户改写comment保护及Undo，不重演已保存的失败。注册/UI仍未交付，未来接入需对应回验。

本轮不要求用户现在重启或重试；不操作工程/选择/Undo/Provider，不暂存、commit、push、创建PR、merge、删分支或tag，不进入A09。证据总入口：[F1a index.json](vela-0.3.12-b2-a08-f1a-offline/index.json)。

## A08-F1a targeted real AE revalidation（2026-09-11）：R1预检失败后停止

**当前：F1a IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION FAIL。** A08未TARGETED_ACCEPTED，不READY FOR COMMIT / PR。前述F1a实施及等待装载内容为历史阶段；本次没有生产/实施测试修改，没有重跑1134/251 assertions或187 suites。

| 组 | 本次结果 | 实际覆盖 |
|---|---|---|
| R1 正常Feature | **FAIL** | 新target/装载来源与公开Detach全文核对通过，独立B1和用户画面确认取得；一次真实保留Detach在额外依赖/属性扫描预检拒绝；B1/B2所查字段未变。没有成功定稿、B2无跳变确认或Undo/B3 |
| R2 非零时间Feature | **NOT COVERED** | R1失败即停止；未新建合成、动画准备或执行动作 |
| R3 Grid小回验 | **NOT COVERED** | 未执行；历史Grid PASS未冒充F1a回验 |

合计 **0 PASS / 1 FAIL / 2 NOT COVERED**。本轮主动发起1次保留Detach、0次成功定稿、0次原生Undo、0次Create/Remove/Provider；这些是本轮操作记录，不是对整个AE会话注入得到的写入或调用计数。

### 环境与装载证据

用户确认[保留摘要；已正常重启、测试工程就绪原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)。依据当前`.debug`的8088重新发现Lomond Cabinet target **`1FBEA019488472ACDE40DB10C37F513F`**，未复用旧ID。真实CEP URL位于Extensions的client/index.html，AE **26.3x87**、CEP **12.0.1**，Host load info无注册加载错误。见[保留摘要；原始环境原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)。

[保留摘要；工作区/映射记录原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)确认Extensions junction仍指向本工作树，当前与映射生产文件SHA相同；分支及HEAD/本地origin/dev仍为 `fix/ad-component-detach-a08-0.3.12` / `d7dd7356cccbb637ae01a7e9d0629b9bc184a388`。不fetch、不切分支、不覆盖既有未提交改动。HEAD不是尚未创建的A08修复提交。

[保留摘要；公开函数比对原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)保存真实 `detachSelectedComponent.toString()` 和工作树提取正文，全文一致；仅CRLF→LF与外侧空白trim，源码提取去除赋值/末尾分号。私有F1a逻辑没有export或独立源码比对。正常装载来源、文件对应和本次错误推进到成员类型检查之后，共同支持新成员准入行为；不将其说成所有私有代码、父链分支或成功定稿均已实测。

### R1独立基线与实际返回

当前工程 `D:\Projects\Vela Test\Vela Test.aep`，合成191 `A01_TOOL_SMOKE`，time=0，duration仍为1帧；10层。唯一选中controller217，source213、generated218保持artifact `ack_20260910_142239_903961`。这些身份经本轮只读重新取得，不沿用旧内存引用。保持原left/fixed：Text Align=0、Pill Width Mode=1、Fixed Width=442、Corner Radius=28。

[保留摘要；B1原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)记录原始comment/code units、类型/来源/标志、parent、属性/关键帧、表达式全文及同一t求值。[保留摘要；基线对照原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)将恢复原文与历史真实创建前[保留摘要；Feature B0原件已本地归档](vela-0.3.12-b2-a08-real-ae/summary.json)逐code unit核对，不仅依赖恢复字段自证。

| 层 | matchName | locked / 3D | collapse / canSet |
|---|---|---|---|
| controller217 | ADBE AV Layer | false / false | false / true |
| source213 | ADBE Text Layer | false / false | true / false |
| generated218 | ADBE Vector Layer | false / false | true / false |

本次读取 `source instanceof FootageItem` 对三层均返回true；Text/Vector未返回可保存的sourceName/sourceId，控制器来源id216。该原始结果与离线Text/Shape source=null模型不同，独立保留；生产对Text/Shape的分流依据matchName，不依赖这两个层的source值。本次不追查Host类型内部机制。三层的可选continuouslyRasterize均为undefined，未改写任何标志。

五类B1实际求值：source Position `[-102.515968322754,0,0]`，背景Position `[102.480079650879,-9.0157470703125,0]`（均为各自local）；Size `[442,46.718994140625]`，Roundness `28`，Color `[1,1,1,1]`。五个表达式均启用、无错误、无关键帧。上述local Position没有直接当作跨Detach的comp空间结果。

自动AE截图经窗口刷新重试仍两次报 `SetIsBorderRequired failed: 不支持此接口 (0x80004002)`，见[保留摘要；采集故障原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)，不是产品失败。用户提供的[保留摘要；本轮B1画面原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)以原字节保存（视图87.5%），并明确[保留摘要；确认“R1画面正常”原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)，未复用旧图。

动作前再次校验工程/合成/time、唯一controller及全部成员comment/parent，与本轮B1一致；直接经CSInterface调用保留Host函数，不增加外层Undo、不使用不存在的registry Detach。[动作原始回调](vela-0.3.12-b2-a08-f1a-real-ae/r1-detach-action.json)：

```json
{"ok":false,"message":"Detach preflight failed; no changes made: Error: Feature Detach: unknown dependency or tool binding on an unsupported property"}
```

采集输出路径最初误写，已将同一已保存文件用Move-Item移入正确证据路径，未重采集、重编码或重试Detach；[保留摘要；采集备注原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)明确记录此文件操作。

### 失败定位、后置观察及尚未证明的原因

实际错误对应 `detachFeaturePlan/checkAdditionalBindings` 中找不到已计划属性的拒绝分支，已不同于旧 `unsupported/locked layer`。依当前源码顺序，这是已通过前面的成员类型/模板准入后到达附加扫描的证据；不是私有函数调用计数或完整父链验证。

随后只读采集[保留摘要；独立B2原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)，[派生比较](vela-0.3.12-b2-a08-f1a-real-ae/r1-refusal-analysis.json)按文本/身份严格、数值绝对误差1e-6比较：4682个数值叶子和1704个严格比较叶子，**0差异**。包括层身份/数量、绑定、原metadata、comment、parent、五个工具表达式、相关属性/关键帧、类型标志及time。还保留固定time下原生sourcePointToComp返回，未注入测量表达式，也未用生产verify值替代读取。

成员transform/text/vector/effect树中保存的非空表达式只有上述五个工具模板。此树不是生产枚举每一步的完整trace；错误未带被拒属性路径，故不能据此宣称用户写入了未知表达式，也不能确定所有枚举属性均被采集。源码用 `edits[k].prop === prop` 做已计划Property引用比对；原生AE包装对象身份差异只是**待验证候选**，本次没有专门身份探针，不将其写成已证实根因。

源码拒绝发生在Undo group与定稿变更之前，独立所查字段也未变。为避免撤销其他历史操作，本次明确不要求用户Undo；未制造B3，也未将“没有Undo”记为恢复通过。快照不能证明AE全部内部状态零写入或原子性；此次未取得成功静态化、画面保持或Undo能力证据。

### 完整性、状态与下一步

[保留摘要；完整性原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)核对455个受保护文件字节未变，涵盖生产/实施测试、冻结架构、包metadata、原100份历史及F1a离线结果等。原两次Feature FAIL、Grid历史PASS和全部Undo记录未改。本次仅新增证据并同步A08报告、当前入口及A08/F1a真实复验状态；总账其他ID、原implementation/targeted_validation/f1对象及f1a.offline对象保持。

只执行本次新增文档/JSON/链接/格式及适用一致性检查；[保留摘要；检查输出原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)、[汇总](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)和[证据索引](vela-0.3.12-b2-a08-f1a-real-ae/index.json)保留实际结果。没有离线回归重跑、真实Provider、Remove、工程保存/关闭/清理或Git写操作。

停止在正常Feature额外依赖扫描预检阻塞。下一项建议是另行授权只读核对**实际被拒属性路径与计划属性身份比较**，再裁定最小修复；当前不放宽模板、类型、关键帧或空间契约，不重试/自动新建更容易的夹具。R2原合成仅1帧的准备限制、R3及三个旅程的原生Undo仍待完成。Detach注册/UI未交付，Remove宽松解码风险未解决，INTEGRATED_ACCEPTED / CLOSED仍留待0.3.12-G，不进入A09。

## A08-F1a-D1：Additional binding / Property identity只读定位（2026-09-11）

**F1a REAL AE REVALIDATION FAIL / D1 DIAGNOSED / FIX DECISION PENDING。** 本轮结论为用户定义的 **A：SAME_PROPERTY_LOCATOR / REFERENCE_MISMATCH**，不实施修复。A08仍未TARGETED_ACCEPTED，不READY FOR COMMIT / PR，R2/R3继续NOT COVERED。上述三次Feature失败、Grid历史PASS及Undo记录保持各自当时事实；前一节“identity只是候选”描述的是D1之前。

### 当前目标、装载与采集方法

本轮复用同一真实可达target `1FBEA019488472ACDE40DB10C37F513F`，AE **26.3x87**；没有发起重启、面板重载、evalFile或实现覆盖。[保留摘要；环境原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)记录target与R1相同，[保留摘要；目标核对原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)确认实际公开Detach全文仍与工作树对应，仅作CRLF→LF/外侧空白归一；私有函数没有新增export或独立全文读取。

实际工程/合成仍为原测试工程、191 `A01_TOOL_SMOKE`、time=0，唯一选中controller217/index1；source213/index3、generated218/index4，artifact `ack_20260910_142239_903961`。诊断前快照与R1拒绝后的B2字段一致，五个原工具表达式仍存在、启用且无expressionError。Extensions映射、分支及HEAD未变，见[保留摘要；工作区记录原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)。

一次性[保留摘要；Host命令原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)通过[保留摘要；CEP命令原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)执行，只读取属性。五个planned Property由生产实际属性链取得：两个Position用Transform Group→Position；背景其余三项用Root Vectors Group→property(1)→Vectors Group→Rect/Fill的实际链。这里的planned对象是诊断持有的实际Property，**不是注入或截获生产内部edits数组**。

locator从每个实际Property的 `parentProperty` 逐级回溯，记录每一级实际propertyIndex、matchName、name，回到depth=0的实际layer并核对id/index。另存layer id/index/name、propertyDepth、最终propertyValueType、canSetExpression、numKeys、expression全文/开关/错误。字段不可读用UNAVAILABLE/ERROR记录，不将显示name或 `String(prop)` 当作身份；name仅供本次全描述对照，未用于任何写入授权。

每项先保留A，再通过同一生产路径重新取得B、额外重复取得D，并枚举A.parentProperty得到唯一索引对应的C；**本次实际取得顺序为A后B/D/C**，不是声称A/B/C/D按字母顺序执行。四个对象各自留存完整locator，随后在Host内做全部6组两两 `===` / `!==`；对照locator及内容之后才编码返回。所有局部引用保留在同一次调用内，没有将跨回调JSON对象相等冒充Host引用相等。

### 实际观察与根因类别

[保留摘要；identity-probes.json原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)记录 **5个属性×6组=30组** 比较：全部 `=== false`、`!== true`，完整locator、propertyIndex/matchName/propertyDepth及记录内容均相同；5个 `A===A` 自比较均true。C的父组枚举每项均只有1个对应索引候选，无取得失败。

只读递归枚举三个成员完整的 `property(n)` 树，访问 **610个节点/610条唯一结构路径**，无遍历错误、无不完整locator；没有在遇到未知项后提前停止。保存所有节点的读取状态，其中507个节点有可读取的表达式/值类型字段，103个分组的这些字段为UNAVAILABLE；后者的结构locator仍完整，不作为“未知表达式”或定位失败。见[保留摘要；scanned-bindings.json原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)。

扫描观察到的“非空或启用表达式”只有原五项。它们均具有起始绑定签名、同artifact、tool=`adComponentKit`、kind=`featureStack`，源角色`sourceLayerBinding`、背景角色`generatedLayer`。签名只按既有注释行读取首值和全部出现位置，没有执行/改写表达式，也没有将签名解析单独视为完整模板准入。

| scanProperty | plannedMatchByReference | plannedMatchByLocator | expressionOwnership | result |
|---|---|---|---|---|
| source213：Position（路径5/2） | 无 | sourcePosition | 同artifact / sourceLayerBinding | A：同路径同内容，引用不等 |
| generated218：Rect Size（2/1/2/1/2） | 无 | generatedRectSize | 同artifact / generatedLayer | A：同路径同内容，引用不等 |
| generated218：Roundness（2/1/2/1/4） | 无 | generatedRoundness | 同artifact / generatedLayer | A：同路径同内容，引用不等 |
| generated218：Fill Color（2/1/2/2/4） | 无 | generatedFillColor | 同artifact / generatedLayer | A：同路径同内容，引用不等 |
| generated218：Position（5/2） | 无 | generatedPosition | 同artifact / generatedLayer | A：同路径同内容，引用不等 |

以上数字为实际逐级propertyIndex，完整matchName/name路径见[保留摘要；逐项表原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)及[comparison.json](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/comparison.json)。每个扫描Property对五个planned对象共25组比较中，引用匹配为0；locator/内容各有5个唯一匹配，其余20个结构不同。五个planned表达式全文也与本轮独立前置快照一致。

生产条件核对：`checkAdditionalBindings` 在canSetExpression可用为真时，检查当前表达式的绑定签名/目标artifact，或待解除parent层上的启用表达式。`isToolOwnedExpression` 的前缀和签名来自expression字符串；空expression不能包含此签名，没有另一个“从property metadata读取无expression binding”的分支。本次保留了空串、禁用以及不可读字段的全部节点观察，未将扫描简化成只搜索五个名字，也未复制一个新准入器去宣称生产通过/拒绝。

**本次AE 26.3x87的五个属性证据确认：同一完整结构位置及相同内容，经不同读取得到的原生Property引用不能用`===`稳定匹配。** 这支持现有计划编辑匹配依赖引用身份导致本场景误拒的归因；不宣称AE引擎bug、所有版本或任意Property都有同样行为。D1没有再次调用Detach，也没有重建历史失败瞬间内部edits/扫描指针trace。

本次树中未发现B类额外工具binding或C类未知活跃依赖；610条locator无重复/不可读，不需归入D。此结论只覆盖本次实际目标与完整已枚举树，不把“未观察到其他问题”扩大成所有工程保证。

### 下一轮最小修复约束（本轮不实施）

1. locator必须绑定具体layer身份及从根到目标的完整属性路径；优先逐级propertyIndex + matchName，name只作诊断，不能单独授权。
2. 同名Effect或Shape group必须由完整祖先结构区分；索引变化、路径缺失、歧义或读取失败继续fail closed，不能退回名称猜测。
3. planned edit与扫描属性同时满足目标artifact、精确属性及完整已知工具模板归属。locator匹配不能绕过模板、历史用户表达式或关键帧保护，也不能扩大可写集合。
4. 原五类属性之外仍fail closed；不改当前帧契约、统一采样、空间补偿、固定容差与部分失败语义，不扩展为A09通用Property寻址系统。

### 证据、完整性与停止

[保留摘要；原始回调原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)保留未经改写的raw、实际命令和真实target；planned/probes/scanned等文件是同一次回调的字段拆分，附原始文件哈希及JSON Pointer，不冒充多次独立采集。

[保留摘要；诊断前原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)/[保留摘要；诊断后原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)解码快照字段deep strict一致；未改变选择、time、metadata、表达式、parent或属性，未Create/Refresh/Detach/Remove、Provider或Undo。该对照仍不是所有Host内部行为的写入计数。

[保留摘要；完整性与检查原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)核对原455个保护文件及上轮R1证据，共478个现有文件字节未变；本轮仅追加本报告与D1证据，当前入口/总账及原验收对象未改。1134/251 assertions和187 suites没有重跑。新增JSON/Markdown/链接/格式及适用一致性检查见[保留摘要；checks.txt原件已本地归档](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)，[summary](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)和[index](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/index.json)汇总实际证据。未执行Git写操作，停在 **D1 DIAGNOSED / FIX DECISION PENDING**。

## A08-F1b Stable Property Locator Matching（2026-09-11）

**F1b IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。A08仍未TARGETED_ACCEPTED，不READY FOR COMMIT / PR；真实R1/R2/R3未执行，未进入A09。本节是局部实现及离线验证，不能覆盖前三次Feature真实失败。

### 基线、D1依据与最小边界

沿用 `fix/ad-component-detach-a08-0.3.12`；HEAD与本地origin/dev均为 `d7dd7356cccbb637ae01a7e9d0629b9bc184a388`。未fetch、切分支或覆盖既有未提交工作树；HEAD仍是实施基线，尚无F1b修复提交。[保留摘要；起始清单原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)保存本轮开始时677个现有文件的哈希。

[D1](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)已经在真实AE 26.3x87记录：五个planned Property，每个四次独立获取，30组两两引用比较均不等，完整locator和内容相同，自比较正常；610个唯一扫描路径仅有原五个工具模板，没有额外binding或未知依赖。本轮不重复D1，不把该有界事实泛化为AE引擎bug或所有Property行为。

生产变更仅在 `host/tools/adComponentKit.jsx` 的Feature Detach preflight及其已授权的校验目标选择。`Remove`、公共JSON、schema/注册UI、Agent和包metadata保持不变；原类型/空间支持范围、当前帧契约、模板/归属准入、采样与补偿算法、写入顺序和固定容差保持。

### locator结构、准入与持有引用

私有 `propertyLocator` 从实际leaf的 `parentProperty` 逐级回溯到预期layer；结构为 `{ compId, layerId, path: [{ propertyIndex, matchName }, ...] }`，path由根至leaf排列。comp/layer id及各级index必须是有限正整数，matchName必须是非空字符串；层级深度逐级一致，路径非空且受现有扫描深度约束，最终root的layer/comp身份必须一致。缺失、异常或不合法即预检拒绝，不回退name、layer.index、String(prop)或引用猜测。

每个通过既有完整模板、artifact、kind/role、历史表达式和关键帧准入的edit保存 `edit.locator`。全体locator先检查唯一性；重复时直接拒绝。扫描仍遍历原成员树和原条件，逐Property构造locator，以compId、layerId、path长度及每一级index/matchName严格比较。name不参与匹配；同名Effect/Shape不因名字相同获准。locator只证明结构身份，本身不授予写权限；原五类以外的同artifact binding及原条件下用户active expression仍拒绝。

`edit.prop`保持原先取得的Property wrapper，用于现有采样、表达式解除、setValue及读回，执行阶段不依据locator重新resolve。

仅替换additional-binding匹配后，[保留摘要；中间结果原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)暴露另一处同源引用比较：执行后用 `release.prop === edit.prop` 选择Position的comp-space校验目标；churn使其错误选中旧local目标，返回 `completed layers: 0, confirmed writes: 14` 的准确部分完成失败。该结果只发生在离线替身，不是新的AE失败。

已向用户说明原授权边界，并取得“允许补齐 preflight 关联”的[明确追加裁定](vela-0.3.12-b2-a08-f1b-offline/scope-decision.json)：preflight使用同一locator严格关联已准入Position edit与既有release；无唯一关联即写入前拒绝。执行后直接使用保存的 `edit.release || edit` 校验目标，不重新查找属性，不改目标数值或容差。未扩大可写集合。

### 修复前后完整生产组合与替身差距

原harness引用稳定，且没有comp/layer id及完整Property父链/深度/index/matchName；现在在类型factory和动态属性组提供这些公共字段。wrapper churn每次property/addProperty/父链获取返回新的Proxy，值、表达式与写入共享同一底层属性；没有缓存wrapper来使比较通过。测试未复制生产locator或Detach，仍通过完整Host loader、真实注册Create Feature Stack及实际保留Detach。

[保留摘要；before.json原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)在生产未修改时记录：真实Create产出的合法Feature、t=2.5，churn使additional-binding误拒，检查字段不变、无Undo group/写入；8项反例检查通过。该“PASS”表示成功记录误拒，不是Detach成功。稳定引用对照可完成原路径。

[保留摘要；after.json原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)使用相同churn机制，五类属性全部准入并定稿。测试还逐个取得五个属性的A/B/C/D，30组引用均不等但底层同一属性；在首个写入后禁止Property再次获取的fixture guard下完整执行通过。name统一改成相同显示文本也不改变身份判断。开发中仅移除了fixture采集日志对matchName的额外读取，以免其抢先触发故障注入；未更换churn语义或恢复引用缓存。before及中间记录未覆盖。

本次真实Create模板配合的是明确的合成求值函数及平移parent替身，不是AE表达式解释器。t=2.5时source/背景Position分别为 `[302.5,205]`、`[303,204.5]`；Size `[102.5,42.5]`、Roundness `7.5`、Color `[0.1,0.2,0.3,1]`。全部必要采样先于首个写入，comp.time不改，注释精确恢复、控制器metadata最后清理。根属性顺序、组数量和空间求值为模型，不宣称复制真实610节点树、真实渲染或Undo。

### 定向拒绝与兼容结果

| 检查组 | 实际结果与边界 |
|---|---|
| wrapper churn / stable wrapper | 正常Feature均完整成功；五类表达式解除，保留原持有wrapper执行；无执行阶段locator查找 |
| index / matchName / layerId / compId / path长度 | 不同结构不匹配；同名叶/祖先组不能授权。跨comp测试明确为公开id在扫描阶段变化的故障注入，未声称在两个真实comp中操作 |
| planned重复 / release关联变化 | 在任何工程写入与Undo group前拒绝；不按数组顺序消解 |
| 必要字段缺失、抛错、非法深度/父链 | planned和scan均fail closed；含无表达式组的不可读index，无弱fallback |
| 第六binding / 用户active dependency | 继续以原额外依赖条件拒绝，没有关闭扫描或只认签名前缀 |
| 模板、artifact、kind、role、历史表达式、关键帧 | 五类路径分别拒绝冲突，locator不绕过原准入 |
| F1a类型/空间 | 真实形态Text/Shape标志继续成功；3D、未知类型、collapsed预合成继续拒绝；完整F1/F1a回归覆盖其余原边界 |
| 数值容差与部分失败 | churn下Position `1e-4` / Color `1e-6` 边界保留；setter/表达式/parent/comment异常准确报部分完成，Undo group结束，未声称自动回滚 |
| Grid / Refresh / 正常Remove | 原路径及相关回归通过；Remove损坏恢复信息的宽松解码风险仍未解决 |

### 本轮实际命令及结果

| 命令 | 本轮结果 / 原始记录 |
|---|---|
| `node scripts/test-ad-component-detach-locator.js …/after.json` | 932 assertions PASS；[保留摘要；focused.log原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)、[保留摘要；逐例结果原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/test-ad-component-detach-finalize.js …/finalize-records.json` | 1134 assertions PASS；[保留摘要；finalize.log原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/test-ad-component-detach.js …/a08-records.json` | 251 assertions PASS；[保留摘要；a08.log原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/test-host-registry-transaction.js` | 27 assertions PASS；[保留摘要；Host registry原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/test-grid-host-contract.js` / `node scripts/test-grid-refresh-idempotence.js` | 120 / 106 assertions PASS；[保留摘要；Grid contract原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)、[保留摘要；Grid refresh原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/run-all-tests.js`，仅一次 | 188 discovered / 188 executed / 187 PASS / 1 FAIL / 0 skip；[保留摘要；原始全量输出原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |
| `node scripts/report-i18n-usage.js`；随后 `node scripts/test-generated-report-guard.js` | 唯一失败为生成报告过期；原脚本更新后46项单独复测PASS；[保留摘要；生成输出原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)、[保留摘要；单项复测原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json) |

全量后未再改生产或测试；仅修正生成文档并单独关闭对应freshness失败，因此当前离线门禁为PASS。**不是一次全量188/188 PASS，也未运行第二次全量。** 1134/251为F1b本轮重新执行；旧F1/F1a的421/1134/251和187 suites日志仍属原实施轮。本轮完整命令与源码哈希见 [validation.json](vela-0.3.12-b2-a08-f1b-offline/validation.json)。

### 检查、证据与下一停止点

新增证据、测试、当前入口、报告及原脚本生成的i18n报告通过语法/ES3用法复核、freshness、一致性、JSON、Markdown本地目标和已跟踪/新增文件分别格式检查；逐文件完整性与范围见 [保留摘要；integrity.json原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)、[保留摘要；checks.txt原件已本地归档](vela-0.3.12-b2-a08-f1b-offline/summary.json)、[证据索引](vela-0.3.12-b2-a08-f1b-offline/index.json)。Node语法/VM不是ExtendScript实机证明。原A08/F1/F1a/D1与三次Feature失败的证据文件字节不变；总账原A08历史对象和其他ID不改。

下一步另行正常装载新Host，先确认私有F1b路径的行为，再完成原R1正常Feature造型保持及用户Undo；R1完整通过后才进行非零t的R2和Grid R3。继续普通2D、已识别类型/模板和受支持平移父链边界；不推广到任意Property定位、全动画或A09坐标系统。未新增Detach注册/UI，其未来接入仍需对应回验。本轮没有AE/CEP、Provider、工程、选择、时间、Undo或Git写操作。

## A08-F1b targeted real AE revalidation（2026-09-11）

**A08（含F1/F1a/F1b）TARGETED_ACCEPTED / READY FOR COMMIT / PR。** 按用户预先授权的通过条件，R1正常Feature、R2非零时间Feature、R3原Grid小范围回验均 **PASS**，三次真实保留Host Detach均取得原始`ok:true`回调，三次用户原生Undo及独立B3恢复核对通过。三组必需旅程：**3 executed / 3 PASS / 0 FAIL / 0 NOT COVERED**；这不表示下列未扩展条件也已覆盖。INTEGRATED_ACCEPTED / CLOSED仍留待0.3.12-G，B2/0.3.12未完成，不进入A09。

### 基线、装载与证据来源

分支仍为`fix/ad-component-detach-a08-0.3.12`，HEAD与本地origin/dev仍是`d7dd7356cccbb637ae01a7e9d0629b9bc184a388`；它是实施基线，**尚无本切片修复提交或PR**。本轮没有生产/实施测试修改、离线回归重跑或Git写操作。工作树中既有Host、测试和生成i18n报告差异属于此前实施，不冒充本轮实机更改。

用户确认保存并正常重启后，从当前`.debug`的AEFT端口8088重新发现真实Lomond Cabinet target `2EB1BDB5BE3E74534D3F0E80CB892B9B`，不同于上轮target。真实AE为 **26.3x87**，CEP **12.0.1**。[保留摘要；环境原始返回原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)、[保留摘要；工作树/Extensions映射原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)与[完整公开函数比对](vela-0.3.12-b2-a08-f1b-real-ae/load-comparison.json)显示：Extensions仍指向当前工作树，工具文件SHA-256均为`e36c1c16a70e3f36f9d8daa9e149c6315e12dbbe9439bf44150daa5bdce175c1`，Host load无加载错误，实际公开`detachSelectedComponent`全文对应当前源码。只归一CRLF→LF与外侧空白；工作树提取去掉赋值左侧/分号。

私有locator/release、类型/模板与定稿辅助没有新增export、临时替换或独立全文比对。正常重启来源、文件对应和随后R1/R2成功行为共同构成本次装载证据；公开函数匹配本身不等于私有闭包已逐字验证。没有重做D1，也没有改Property、collapse/type标志、全局JSON或对象原型。

Node采集器只连接真实CEP的CDP，执行实际`CSInterface.evalScript`并保存回调；没有用Node VM替代AE。每次动作只调用一次`AEToolbox.tools.adComponentKit.detachSelectedComponent()`，无外层Undo group、无不存在的registry Detach、无Remove/Provider。动作回调先保存，再独立读取B2；没有用生产`verifyDetachValue`目标自证后置结果。实际命令、回调、图片、派生比较和用户确认均见[本轮证据索引](vela-0.3.12-b2-a08-f1b-real-ae/index.json)。

### 三组有界旅程

| 组 | 实际对象、结果与证据 |
|---|---|
| R1 正常Feature | 原`A01_TOOL_SMOKE`（comp191，一帧，t=0）；controller217/source213/generated218，artifact `ack_20260910_142239_903961`；保持left/fixed、宽442。Text/Shape实际collapse=true/canSet=false，未锁定、2D。五个工具表达式均解除、禁用且无错误；Size/Roundness/Color与B1求值相符，两个Position在相同空间中符合既定容差；源注释48个code units与真实历史Feature B0一致。层数/身份、其他组件及已采集用户数据保留。用户确认前后画面正常、执行一次Undo；B3全部已采集字段与B1一致。[R1汇总](vela-0.3.12-b2-a08-f1b-real-ae/r1-summary.json)、[B2比较](vela-0.3.12-b2-a08-f1b-real-ae/r1-b2-comparison.json)、[B3比较](vela-0.3.12-b2-a08-f1b-real-ae/r1-b3-comparison.json)。 |
| R2 非零时间Feature | 经[用户明确许可](vela-0.3.12-b2-a08-f1b-real-ae/r2-preparation-authorization.json)新建`A08_F1B_R2_NONZERO`（comp219，5秒），没有延长旧合成。通过[保留摘要；实际Create UI原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)创建left/fixed宽442的Feature：controller235/source231/generated236，artifact `ack_20260911_113335_475799`。准备与Detach分属不同Undo步骤；源注释43个code units先读回到[保留摘要；B0原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)。控制器Corner Radius关键帧为0秒8、2秒20，当前t=1秒实际Roundness=14，而底层值28；夹具有明确差异。Detach后五个工具属性静态值取自t=1；在不改comp.time的0/2/1秒只读求值中，Roundness均为14。控制器两关键帧及其插值记录、无关层Opacity动画/Rotation表达式保留。用户确认无跳变、一次Undo；绑定、五个表达式、属性、控制器动画及参考时刻读数均恢复。[R2汇总](vela-0.3.12-b2-a08-f1b-real-ae/r2-summary.json)、[时间对照](vela-0.3.12-b2-a08-f1b-real-ae/r2-temporal-comparison.json)、[B3比较](vela-0.3.12-b2-a08-f1b-real-ae/r2-b3-comparison.json)。 |
| R3 Grid小范围回验 | 复用原comp191/t=0中的controller212，artifact `ack_20260910_122851_618743`，没有重新创建或改写历史夹具。新B1确认源206的非空原注释、源207明确空恢复字段，与历史真实Grid B0对应；源206仍有外部parent210；源208的comment已由用户改为普通文本且parent212受保护。Detach恢复源206的47个code units与源207空注释，保留所有层；仅解除归属内源207的parent，源206外部parent、源208当前comment/parent和无关数据保持。源208不被描述为“成功恢复原注释”。用户确认当前合成确为`A01_TOOL_SMOKE`、一次Undo无异常且画面无变化；B3所查字段恢复B1。[R3汇总](vela-0.3.12-b2-a08-f1b-real-ae/r3-summary.json)、[B2比较](vela-0.3.12-b2-a08-f1b-real-ae/r3-b2-comparison.json)、[B3比较](vela-0.3.12-b2-a08-f1b-real-ae/r3-b3-comparison.json)。 |

### 比较口径与有限证明

定稿几何/Position绝对误差固定`1e-4` AE单位，Color每通道固定`1e-6`。先由独立B1中的真实parent、Position、Anchor及单位Scale/零Rotation读数推导图层anchor的comp XY，再与B2比较；另存实际`sourcePointToComp`的图层原点/边界点结果。局部Position没有直接当作comp坐标；未注入坐标测量表达式、未改变采样时间，也未把生产目标值当独立测量。

R1原生点10组，最大绝对差约`6.1035156023e-5`；R2原生点10组、R3原生点5组，最大差均为0。五个Feature属性全部按各自B1求值核对，不只看`expressionError`。这些点及用户固定视图观察不是整幅逐像素证明，也不证明任意父链/空间成立。

Undo恢复按文本/身份严格、数值绝对误差`1e-6`比较，没有沿用定稿较宽的`1e-4`。R1比较5330个数值叶子/1710个其他叶子；R2比较2306/668（含独立参考时刻恢复）；R3比较5330/1710；三组差异均0。这是已采集字段恢复，不能推断AE全部内部状态或未采集TextDocument字段；一次Undo对照的是各组Detach前B1，**不要求回到创建前B0，也不撤销R2动画准备**。

### 采集差异、原始记录与剩余边界

- 原生截图工具两次返回`SetIsBorderRequired ... 0x80004002`，未返回图片；[采集限制记录](vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-screenshot-errors.json)为工具错误转录，非Host trace。本轮四张R1/R2图片来自用户附件原字节，前后确认分别保存；R3没有另造截图，其画面/Undo采用[用户组合回复](vela-0.3.12-b2-a08-f1b-real-ae/r3-undo-user-confirmation.json)，与Host读数区分。
- R2有一次只读采集命令的本地目录拼写错误，`ENOENT`发生在打开WebSocket/发送Host命令之前；[错误记录](vela-0.3.12-b2-a08-f1b-real-ae/r2-collection-error.json)明确为工具输出转录。更正路径后取得B2；没有第二次Detach，没有把采集错误归为产品失败，也没有抹去错误。
- R2通过真实页面Create按钮的生产handler创建；该Create动作自身的Host原始回调**未拦截、保持未知**，不伪造回调或将创建后快照冒充动作原文。三次被测Detach原始回调均实际取得。面板创建表单显示的圆角28是保存的创建参数，不代表动画控制器在t=1的实际求值14。
- 当前帧定稿只覆盖声明的普通2D、已识别Text/Shape/支持的AV类型、完整已知Feature模板及受支持平移父链。不是任意Property、任意动画、全时间轴烘焙、任意父链/3D或通用坐标系统；控制器/无关用户动画不被要求静态化。
- collapsed预合成、未知类型、非平移父链、待写属性关键帧、历史用户表达式冲突、损坏恢复资料、未知模板、采样/执行中故障等仍依原fail-closed边界；本轮未注入这些故障，其离线证据不升级为真实AE覆盖。**Remove损坏恢复资料下的宽松解码风险仍未解决**。没有保存历史parent，不能声称恢复到创建前parent。
- Detach注册/UI仍未交付；本次是“实际注册创建＋保留Host Detach”的有界验收，未来接入注册/UI后仍需对应回验。原三次Feature失败、D1、历史Grid PASS及全部Undo原始记录保持各自历史结论。A01/A11/F1/G-02的实现、历史报告和acceptance裁定不变。

### 本轮文档检查与停止点

实施轮离线事实原样复用：locator932、finalize1134、A08 251及相关Host/Grid通过；全量**只运行一次：188 discovered /188 executed /187 PASS /1 FAIL /0 skip**。唯一失败是生成i18n报告过期，原生成脚本更新后该guard单独46项PASS；**不是188/188全量PASS**。本次实机轮没有重跑这些测试或覆盖其日志。

[保留摘要；完整性结果原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)覆盖起始698条清单及包含忽略日志的192条历史清单，去重710个已有文件；文档收束仅允许7个现有A08当前入口/报告/总账文件改变，生产、实施测试、冻结架构、包版本及全部历史证据字节保持。只执行新增证据JSON/命令语法、Markdown本地链接、已跟踪差异与逐个新增文件格式、i18n freshness和项目一致性检查，结果见[保留摘要；checks原件已本地归档](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)及[最终汇总](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)。生成i18n报告本轮未改。

同轮同步A08主报告、指导书/总账和必要当前入口；历史报告正文及原acceptance对象不重写。接受仅限上述范围。当前可由用户提交并创建面向dev的PR，修复commit/PR关联待实际产生后记录；本轮未暂存、commit、push、创建PR、merge、删分支或tag。所有测试资产保留在当前可丢弃工程，未自动保存、关闭或清理。**到此停止，不进入A09。**
