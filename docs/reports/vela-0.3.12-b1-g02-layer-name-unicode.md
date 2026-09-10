# 0.3.12-B1 / G-02 — 图层名 Unicode 代理项与 UTF-8 字节边界

**当前：TARGETED_ACCEPTED / READY FOR COMMIT / PR（2026-09-10）。** 四组定向真实验收通过。实施轮587/342 assertions、185/185 suites是此前离线结果，本次没有重跑。下文实施和待实机计划保留当时时态；本次实际结果见末节。INTEGRATED_ACCEPTED / CLOSED留待0.3.12-G，B1/0.3.12未完成，不进入B2。

## 基线、来源与范围

实际分支 fix/vela-layer-name-unicode-g02-0.3.12；HEAD与本地origin/dev均为787cef2c8315a7d5c8a208dae69473f488d4e559，开始工作树干净。未fetch或修改任何Git引用。本地历史证实PR #203合并A11含F1（修复节点5231d04）。当前HEAD是实施基线，不是尚未创建的G-02修复提交。

已读取AGENTS、唯一ROADMAP、指导书G-02和A0对应条目。旧独立最小复现脚本未归档；保留这个来源限制，不追索、不补造。本轮证据直接require仓库生产velaCapabilityContracts，通过validateCapabilityParams(getLocalProjection("set-layer-name-v1"), params)及validateRepresentationCapabilityParams("set-layer-name-v1", params)获取结果，没有复制validator或新增生产export。

生产差异仅[velaCapabilityContracts.js](../../client/js/vela/velaCapabilityContracts.js)的一处条件。公共Host JSON、A01/A11/F1、Vela专用JSON、冻结架构、Authority/Review/JIT/Verify和metadata 0.3.6未改。

## 修复前生产事实与最小修复

[修复前原始记录](vela-0.3.12-b1-g02-before.json)包含42个样本×两个入口=84条：接受36、拒绝48；其中5种非法样本在两个入口误接受，共10条。分别为D800单个/末尾、DBFF单个/末尾、合法代理对后再接DBFF。开头/中间高代理项后接普通字符、低代理项、连续高代理项及反向组合已拒绝。普通名称、末尾合法代理对及字节边界对照记录同时保留。

根因：高代理项位于末尾时charCodeAt(index+1)返回NaN，next < 0xDC00和next > 0xDFFF均为false。原算法错误加4 bytes并跳过末尾。条件新增index + 1 >= value.length，沿既有Error消息通路拒绝：CAPABILITY_CONTRACT_INVALID: Layer name contains an invalid Unicode scalar.。错误对象没有独立code字段；不是新增错误类型。

没有trim、normalization、替换、截断或删除名称。合法代理对仍计4 bytes；ASCII/2字节/3字节字符算法不变。上限仍为256 UTF-8 bytes；空白、控制字符、字段/type规则与冻结{name}公开返回保持。

[修复后原始记录](vela-0.3.12-b1-g02-after.json)仍为相同84条：接受26、拒绝58，0预期差异；变化恰为前述10条误接受。畸形输入使用String.fromCharCode构造，保存每个UTF-16 code unit，无U+FFFD替代。畸形样本不声称有“精确UTF-8长度”。

## 参数与实际组合回归

复用[test-vela-capability-contracts.js](../../scripts/test-vela-capability-contracts.js)，输入/观察辅助[velaLayerNameUnicodeCases.js](../../scripts/diagnostics/velaLayerNameUnicodeCases.js)只生成样本和调用实际exports。覆盖高低范围端点、单个/开头/中间/末尾、反向/连续高、合法对后孤立项、最小/最大合法代理对、连续emoji、多语言和原有规则。两个公开入口均覆盖。合法字节数分别用Buffer.byteLength与encodeURIComponent所得UTF-8序列长度作独立参考；两者不是生产实现。非法代理项由code unit与独立代码点迭代确认。

| 精确字节 | ASCII | 中文混合 | 代理对混合 | 预期 |
| --- | --- | --- | --- | --- |
| 255 | a×255 | 中×85 | 😀×63+中 | 接受、原内容保持 |
| 256 | a×256 | 中×85+a | 😀×63+中+a | 接受、原内容保持 |
| 257 | a×257 | 中×85+aa | 😀×63+中+aa | 既有字节上限拒绝 |

utf8ByteLengthExact只由validateLayerNameParams调用；该函数由两个公开入口分派。实际直接消费者包括ProviderIntentGate、ProviderProposalRouter、LogicalPlanContracts、PlanReviewProjection、AuthorizedPlanMaterializer、ExecutionPreflight与ProviderAdapter对返回观察的校验。CepModuleLoader只检查模块接口存在。消费者不需修改。

上游ProviderController经真实IntentGate检查参数；Router再次校验后进入本地Authority桥接。CapabilityCompiler用capability schema检查字段/类型并建立无执行授权的candidate，它不是专用Unicode校验的替代；授权后Materializer在createBoundPlan前再次调用真实参数validator，Preflight在绑定、fresh执行及相关观察路径再次验证。没有将编译candidate等同可执行授权，也未改Compiler语义。

复用[test-vela-provider-production-e2e.js](../../scripts/test-vela-provider-production-e2e.js)的真实Runtime/ProviderController/IntentGate/Router/Driver/Authority/Preflight/ExecutionAdapter/Verify组合。替身是既有Provider响应transport、Host context/execution边界及Node运行依赖；不运行真实网络Provider或AE，也不复制校验与路由逻辑。

| 实际组合条件 | 实际状态 | Host只读context调用 | Host mutation |
| --- | --- | --- | --- |
| 合法请求Hero，响应name为单D800、Hero+DBFF、Hero+DC00（各一例） | intent-rejected | 每例3 | 每例0 |
| 请求正文也含同样畸形代理项（各一例） | failed / PROVIDER_CONNECTION_FAILED | 每例3 | 每例0 |
| 标题日本語 😀 | Review前0 mutation；批准后completed | 14，含1次提交后Verify | 1 |

合法请求+非法响应：实际IntentGate调用contracts在目标匹配之前返回invalid-proposal；本轮contracts suite也直接通过真实IntentGate验证该拒绝理由。正文畸形的另外三例更早在LocalTransport请求UTF-8检查失败，尚未进入Provider提案准入，不把它算作专用validator独立覆盖。合法案例必须通过真实Review的reviewId/revision批准，保留原名直至授权；结果名称完整，提交后Verify一次。

修复前组合[第一次采集输出](vela-0.3.12-b1-g02-chain-before.txt)只含首例intent-rejected；采集测试最初过窄地预期failed而断言失败，随后允许真实intent-rejected状态。[修复前接续输出](vela-0.3.12-b1-g02-chain-before-complete.txt)记录3个非法响应均0 mutation和合法名称流程。修复前高代理项虽然通过contracts，但与请求Hero不匹配，已有IntentGate目标匹配保护；低代理项已在contracts拒绝。因此这些修复前组合不证明畸形Unicode已写入Host或存在权限绕过。原输出不覆盖。

开发时另发现测试错误地期待Error.code；按生产现有message前缀纠正测试，未修改生产错误形状。最终focused与全量结果见下，不把开发中失败隐藏为产品通过。

## 本轮离线验证

[Focused原始输出](vela-0.3.12-b1-g02-focused.txt)保留9个命令及退出码：contracts 587、compiler 54、IntentGate 56、Router 37、Materializer 28、Preflight 581、ExecutionAdapter 13、生产E2E 342 assertions；LogicalPlanContracts PASS（脚本不输出断言数）。对应脚本均为node scripts/test-vela-*.js，完整名称见日志。

最终生产/测试状态仅运行一次node scripts/run-all-tests.js：[本轮全量原始输出](vela-0.3.12-b1-g02-offline.txt)。发现185、执行185、通过185、失败0、skip0。未新建顶层suite；辅助文件由现有contracts suite使用，沿原测试发现机制。全量后未再修改生产或测试。

A01/A11历史报告、原始证据及acceptance裁定保持原样；本轮185结果是G-02新执行，不借用F1的同样套件数。当前入口与总账仅同步G-02事实，并按Git补A11 PR #203合并关联。

## 后续有限真实AE/CEP计划（本轮未执行）

1. 从现有.debug调试配置重新发现真实Lomond Cabinet target，重载面板使新客户端contracts装载。确认实际script资源velaCapabilityContracts.js对应工作树；在DevTools Sources中检查实际闭包utf8ByteLengthExact的存在性条件，并用末尾D800拒绝/末尾合法pair接受作行为对照。公开函数toString不包含私有闭包，不能仅比对公开函数、版本号或Host JSX便声称新实现已装载。
2. 实际浏览器模块按源码注册为window.VelaCapabilityContracts。先检查该对象和两个公开方法存在；不存在则停止确认loader，不临时注入模块。Console只在局部内存中调用下列入口，保存每次codeUnits、返回或错误；非法名称不写工程：

```javascript
(function () {
  var c = window.VelaCapabilityContracts;
  var s = "Hero" + String.fromCharCode(0xD800);
  var units = []; for (var i = 0; i < s.length; i++) units.push(s.charCodeAt(i));
  try { return { units: units, result: c.validateCapabilityParams(c.getLocalProjection("set-layer-name-v1"), { name: s }) }; }
  catch (e) { return { units: units, error: String(e.message) }; }
}());
```

同一局部输入再调用validateRepresentationCapabilityParams("set-layer-name-v1", {name:s})。有限负向选单/末尾高、孤立低、合法对后高；正向选末尾emoji、多语言，及表中三组255/256/257 bytes。按本轮已核实window.VelaProviderIntentGate.evaluate({message:"将当前图层重命名为 Hero", capabilityId:"set-layer-name-v1", params:{name:s}})检查真实提案准入拒绝；先确认实际模块可达，不自行猜测其他debug API。记录这是直接参数/IntentGate调用，不冒充完整Provider响应注入或内部派发计数。
3. 合法“标题日本語 😀”另行在用户确认的可丢弃工程，通过已有Vela用户消息、Review批准、执行、Verify路径测试；按既有规则另行准备Provider，不要求模型生成畸形Unicode。用户确认真实名称和Undo，且将Host mutation与读取分列。所有字节边界仅需内存校验，不逐条写入工程。
4. 若实际CEP载入不一致或必需入口不可达，停止并报告；不临时覆盖函数。真实AE字段接受范围、UI显示及Undo均仍NOT COVERED，不能由Node组合通过推导实机验收。

## 收尾检查与停止点

node --check覆盖生产文件、两个修改后的suite及新增样本辅助；i18n freshness、项目一致性、JSON解析、本地文件链接、git diff --check及新增文件逐项git diff --no-index --check通过。见[检查记录](vela-0.3.12-b1-g02-checks.json)，其中代码哈希标识最终离线验证状态。84条前后记录逐项比较：仅10条原误接受改为拒绝，其余74条返回/错误一致。新增检查JSON与本段再单独检查格式。

保留当前工作树，不暂存、commit、push、创建PR、merge、删分支或tag。真实AE验收待另行授权；状态保持IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING。

## Targeted real AE/CEP acceptance（2026-09-10）

四组必需项均通过，按用户预授权收束为TARGETED_ACCEPTED / READY FOR COMMIT / PR。[派生汇总与用户确认](vela-0.3.12-b1-g02-real-ae/summary.json)。没有运行离线回归或修改生产/实施测试。

### AE-01：实际客户端装载 PASS

用户先确认会话已保留、无活动任务。[验收前工作树快照](vela-0.3.12-b1-g02-real-ae/before-worktree.json)记录495份既有文件。通过.debug指定8088发现页重新识别真实Lomond Cabinet target 3E919B0206D5A416C3F8EAEDCAC77F7F，正常点击调试目标重载。初次浏览器inventory连接失败后直接发现页恢复；没有沿用旧target。

从DevTools Sources已加载的velaCapabilityContracts.js编辑器全选复制完整脚本，保存[原源码及比对](vela-0.3.12-b1-g02-real-ae/ae01-loaded-source.json)。仅CRLF→LF归一，与当前工作树完整相等，包含私有utf8ByteLengthExact存在性条件。不是另读磁盘冒充执行源码。[真实环境与行为对照](vela-0.3.12-b1-g02-real-ae/ae01-environment.json)：实际CEP12.0.1/Chrome99，两个公开方法和IntentGate可达；Hero+孤立D800拒绝、Hero+合法emoji接受。此初始行为记录inputUnits字段实际为代码点数量，明确不当作code unit证据；完整逐项签名在AE-02中。

### AE-02：84/84 PASS

[84条实际参数记录及完整命令](vela-0.3.12-b1-g02-real-ae/ae02-parameters.json)使用42份既有样本的code unit数据，在CEP用String.fromCharCode重建，再调用当前window.VelaCapabilityContracts两个真实入口；未require另一份模块。26接受、58契约拒绝，不是58次失败。合法输出形状、冻结状态和名称code unit相等；错误message与既有前缀及具体拒绝原因匹配，不要求Error.code或新异常类型。

合法字符串包括257字节超限对照，用CEP encodeURIComponent/unescape的独立UTF-8参考核对；畸形代理项不作替换后字节合法性推断。汇总逐项映射原误接受10条；其余74条返回或拒绝原因与实施前后记录对应。此次JSON仅为结果容器，不是以容器可解析替代名称检查。

### AE-03：4/4 PASS

[实际IntentGate输入与完整结果](vela-0.3.12-b1-g02-real-ae/ae03-intent-gate.json)：合法Hero请求对应单D800、Hero+DBFF、Hero+DC00均allowed=false/reason=invalid-proposal；名称完全一致的多语言请求allowed=true/reason=allowed。它们是直接CEP准入调用，不是完整Provider非法响应注入，不声称取得Host派发计数。

### AE-04：真实合法rename、Verify与用户Undo PASS

用户确认测试工程已启用、选中名称不同于目标的唯一图层，并通过现有UI确认Provider已就绪；未更换模型/endpoint或启动资格测试。[初始目标](vela-0.3.12-b1-g02-real-ae/ae04-target-before.json)：合成A01_TOOL_SMOKE（id191）、图层id203/index1，原名A01 中文 Smoke。

[初次输入命令](vela-0.3.12-b1-g02-real-ae/ae04-request.json)因Console选择器引号语法错误未触发发送；[纠正后的实际输入与Send按钮命令](vela-0.3.12-b1-g02-real-ae/ae04-request-corrected.json)经现有UI处理器发送唯一请求“将当前图层重命名为 标题日本語 😀”，没有调用Runtime执行方法或直接赋layer.name。[初次尚无Review的UI文本](vela-0.3.12-b1-g02-real-ae/ae04-review-ui.json)保留，不冒充成功提案。

真实Provider生成正确localProposal，IntentAllowed=true；[Review与现有Runtime/轨迹投影](vela-0.3.12-b1-g02-real-ae/ae04-review.json)显示A01 中文 Smoke → 标题日本語 😀，REVIEW_REQUIRED。[批准前Host读取](vela-0.3.12-b1-g02-real-ae/ae04-pre-approval.json)确认同一目标仍为原名。用户实际点击批准，未伪造reviewId/grant/AuthorizedPlan。

[执行后Host原始回调](vela-0.3.12-b1-g02-real-ae/ae04-after-execution.json)确认同一compId/layerId，目标code units为26631,39064,26085,26412,35486,32,55357,56832。[Agent自身终态与Verify投影](vela-0.3.12-b1-g02-real-ae/ae04-terminal.json)另行记录hostCommitted=true、mutationDisposition=mutated、verification=verified-match、freshAtRead=true、scope=committed-target、expected/actual均为目标名称，任务completed。该现有投影带provenance/sourceObservationId，不以我们单次后置读数冒充Agent Verify；其中targetRef/providerRequestId未接线等unknowns原样保留，不编造内部调用次数或原始网络trace。

用户随后执行一次原生Undo并回复“已撤销，名称恢复”。[Undo后同一目标Host回调与用户确认](vela-0.3.12-b1-g02-real-ae/ae04-user-undo.json)确认原名及全部code unit与基线相同。用户确认、UI文本、Host读数和Runtime轨迹分别标注来源。

### 采集问题与覆盖边界

[采集问题记录](vela-0.3.12-b1-g02-real-ae/collection-issues.json)保留异步copy作用域错误、发送前引号语法错误、执行后及Undo后首个只读回调未捕获。后两项以独立read2标签重新采集，没有补造第一次回调。没有把采集错误算作产品失败，也未删除它们。首个读数回调缺失不影响另行取得的Agent Verify与同一目标恢复对照。

本次未包装派发函数、替换transport、注入Authority或修改生产模块。所有畸形参数和字节边界留在内存；工程中只执行一次合法rename及用户一次Undo。实施轮Host替身计数不作为本轮实机计数。A01/A11限制与历史裁定保持；整合验收/CLOSED留待0.3.12-G，不宣布B1封存。HEAD仍为787cef2实施基线；G-02修复提交尚未创建。

本次收尾：i18n freshness、项目一致性、JSON、本地链接、已跟踪差异及全部新增文件逐项格式检查通过。见[完整性检查](vela-0.3.12-b1-g02-real-ae/integrity.json)：对照495份验收前文件，只有8份授权文档变化，生产、实施测试、before/after及focused/offline历史日志均未变。新增完整性JSON与本节另行检查格式；未暂存、提交、推送或执行其他Git写操作。
