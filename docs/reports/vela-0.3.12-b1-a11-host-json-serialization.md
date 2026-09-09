# 0.3.12-B1 / A11 — 公共 Host JSON serializer 与F1成员名准入

**当前：TARGETED_ACCEPTED / READY FOR COMMIT / PR（A11含F1）。** A11（含F1）真实复验：入口20/20、编码310/310、公共返回3/3 PASS；10项含NUL对象键按用户预授权接受为Host支持范围限制，不计编码PASS。INTEGRATED_ACCEPTED / CLOSED 留待0.3.12-G。

| 阶段 | 生产范围与证据来源 |
| --- | --- |
| 原A11实施 | jsonEscape/toJson键值编码；2307项及184 suites，历史离线结果 |
| F1实施 | 新增公共parseJson的NUL成员名准入；重新执行224/1122/2307/27项及185 suites，历史离线结果 |
| 本轮真实复验 | 新装载四函数匹配；入口20、编码310、公共返回3通过；10项支持限制接受。本轮未运行上述离线回归 |

以下按阶段保留原始过程。旧段落中的“本轮”“仅改serializer”“未装载”“未接受”均指当时阶段；当前结论以本摘要和末尾本次复验裁定为准。首次矩阵3 PASS /1 FAIL /316 NOT COVERED不改写。

## 基线与范围

- 实际分支：fix/host-json-serializer-a11-0.3.12。
- 初始 HEAD 与本地 origin/dev：9dee61ee2d2a3ce2f8dd90107fe5343299063eb8，与用户提供的 A01 PR #202 合并基线一致；初始工作树干净。本轮没有 fetch、切换或新建分支。
- A01 parseJson 实现、TARGETED_ACCEPTED 及其剩余覆盖裁定保持；原始 A01 报告/证据、A0、审计档案、冻结架构与包 metadata 0.3.6 未改动。
- 生产改动仅 [host/index.jsx](../../host/index.jsx) 的 jsonEscape 与 toJson 键名编码。stringify 通过已有 jsonEscape 调用获得完整转义，不改自身类型分派、递归与字段筛选。
- 此 HEAD 为实施基线，不是 A11 修复提交；本轮未暂存、commit、push、创建 PR、merge、删分支或 tag。

## 来源与修复前生产证据

已读取 [A0 的 A11 计划](vela-0.3.12-a0-baseline-reconciliation.md)、[指导书](../design/vela-0.3-reconstruction-guidance.md) B1/A11 和[原审计 A11](audit-baseline-0.3.11/source-audit.md)。只读检查 source-evidence.zip 内 lomond_audit_0311/core-results.json 的 HOST-JSON-CONTROL：U+0001 roundTrip throws，newlineControl passes；reproduce-core.js 明示 extracted-source probes、NOT full-repository or AE tests。本轮没有重跑该摘录。

本轮新增 [生产 serializer suite](../../scripts/test-host-json-serialization.js)，复用未修改的 [A01 完整 Host harness](../../scripts/fixtures/host-json-entry-harness.js)，按实际 include 顺序展开完整 Host 并通过 File/Folder/$ 模拟装载实际工具模块。没有复制 serializer 函数，也没有以公共 parseJson 自往返作为判据。

修改生产前执行 node scripts/test-host-json-serialization.js --baseline，保存 [1026条修复前生产模块记录](vela-0.3.12-b1-a11-before.json)：3种 Host JSON 环境 × 38种输入 × 9条输出路径。每条保留输入、被测 raw 字符串、测试侧独立 Node JSON.parse 的结果或异常。记录文件为 JSON 容器，raw 字段解码后即被测原始输出；判定发生在包装记录前，不会用容器合法性冒充 serializer 合法性。文件包含基线、命令、Node 版本及 git HEAD 原始 Host blob 的 SHA-256（不等于 Windows 换行后的工作树文件哈希）。--baseline 是记录模式，未来运行会反映当时生产代码，不会重造历史缺陷。

| 路径 | 修复前逐个 C0 结果 | 修复后 |
| --- | --- | --- |
| jsonEscape 作为 JSON 字符串正文、toJson 值、stringify 值/键、嵌套、getHostLoadInfo | 仅 TAB U+0009、LF U+000A、CR U+000D 可被独立解析；其余29个失败 | 全部32个逐个及组合解析成功，内容相同 |
| toJson 键名，字符串/数字/布尔值三分支 | 全部32个失败，键名未转义 | 三分支全部正确转义键名 |

U+0001 与换行正向对照符合原审计条件，但本轮证据为完整生产模块 VM。额外确认 toJson 的引号/反斜线及字面量转义键名存在编码问题；这属于本轮字符串编码范围。引号/反斜线值、普通中英文、多语言、合法 Unicode 和字面量反斜线文本作为正向对照保留。

## 最小修复与兼容

jsonEscape 保留既有反斜线、引号、CR/LF/TAB 的替换及其短转义拼写，随后用 ES3 正则和函数回调将剩余实际 C0 编码为四位十六进制 JSON Unicode escape。此顺序不会再转义刚生成的反斜线；输入中的字面量反斜线在前一步只编码一次。未删除字符、替换空格或清洗业务数据。

toJson 在数字、布尔和其他值三条拼接路径均调用 jsonEscape(k)。值的 String 转换语义保留：null/undefined 为字符串，数组和对象仍按原有 String 转换；不与 stringify 互换。stringify 保留 null/undefined、嵌套数组对象、自有字段、忽略函数和下划线前缀键等行为。不修改非有限值、循环、getter、quota 或代理项业务校验，也不改 Vela 专用 JSON 和 CEP evalScript 桥接/装载顺序。

兼容测试同时检查正常输出的精确字节拼写、平面转换、自有字段、递归筛选和嵌套结构。全部字符串往返均由测试侧独立 JSON.parse 后与原字符串/结构比对，而非只断言输出可解析。

## 公共返回链与覆盖边界

静态检索公共调用位于8个文件：host/index.jsx、adComponentKit.jsx、selectionInfo.tool.jsx、textBackgroundBox.jsx、shapeAdd.jsx、shapeAdd.tool.jsx、registryControlLab.tool.jsx、settingsRendererLab.tool.jsx（后7个位于 host/tools/）。普通工具的平面信封使用 toJson，嵌套状态/目录使用 stringify，Shape Add 的部分结果拼接使用 jsonEscape；后者也自动获得修复。客户端 main.js 的 evalHost/parseHostResult 用 JSON.parse 消费回调；调用方未改动。

实际组合验证选取 getHostLoadInfo：测试只在 VM 内设置 _registeredToolLoadErrors=[sample]，调用真实公共诊断函数，经真实 toJson 输出，再由独立 JSON.parse 检查完整错误字符串和正常信封。该字段是测试注入的 Host 内存诊断数据，不声称真实加载故障或工程字段支持控制字符。另调用真实 getSelectionSummary 的无活动合成成功结果，以及 runRegisteredToolAction 的未知工具错误结果，核验正常成功/错误信封；不是手工信封冒充入口结果。

VM 的 File/Folder/$ 适配读取仓库实际模块，app/CompItem 是替身，数组等构造在相同 VM realm 中。三个环境为 Node VM 默认 JSON、JSON 存在但 parse 缺失、JSON 缺失；独立测试解析器始终位于 VM 外。完整模块装载不代表完整 AE 对象模型、ExtendScript 正则引擎或 CEP 跨进程传输已覆盖。未展开所有工具参数矩阵，未验证真实工程字段接受哪些控制字符；没有工程数据写入。本轮未发现需扩大修改范围的新问题，已知类型/递归边界未重新裁定。

## 本轮实际离线验证

| 命令 | 实际结果 |
| --- | --- |
| node --check scripts/test-host-json-serialization.js | PASS |
| node scripts/test-host-json-serialization.js | 2307 assertions PASS，3种 Host JSON 环境 |
| node scripts/test-host-json-entry.js | 1122 assertions PASS，本轮重新执行的 A01 回归 |
| node scripts/test-host-registry-transaction.js | 27 assertions PASS |
| node scripts/run-all-tests.js | 最终生产/测试代码状态执行一次：发现184，运行184，通过184，skip 0 |

[全量离线原始输出](vela-0.3.12-b1-a11-offline.txt)由现有脚本产生并按字节复制保存；发现机制自动纳入 scripts/test-*.js，无需修改 runner。以上为本轮运行结果，不沿用 A01 的183/183冒充本轮结果；A01 六组实机验收仍仅为历史证据。本轮编写测试时曾出现字面量转义的 JavaScript 语法错误，在生产复现前修正；该错误不属于 Host 行为。Host 改动保持 var/function/ES3 字符串 API，完整 VM 装载验证通过，但不是实际 ExtendScript 解析证明。

## 后续只读真实 AE/CEP 验收计划（本轮未执行）

1. 确认真实 Lomond Cabinet CEP、Extensions 映射和已重启装载的新 Host。读取实际 jsonEscape/toJson/stringify 函数内容，与本轮工作区实现对应；固定版本号或 getHostLoadInfo 成功本身不够证明装载。
2. 在 Host 内存构造全部32个 C0（逐个及组合）、引号/反斜线、字面量转义及多语言文本。分别调用实际 jsonEscape（仅加 JSON 字符串引号）、toJson（键和值，数字/布尔值键路径）、stringify（含嵌套数组/对象）。不写 comment、图层名、文本或其他工程字段。
3. CSInterface.evalScript 回调直接保留被测 serializer 原始输出；先保存 raw，再直接 CEP JSON.parse(raw)。独立对比字段、字符串长度和 code unit，不能先将输出再包装成额外 JSON 信封再判断合法性。对失败保留原始回调与异常，不清洗控制字符。
4. 只读调用 getHostLoadInfo/getSelectionSummary，核对正常公共返回和 CEP 消费。无需模拟真实加载故障或改写生产方法；离线诊断注入不要求在真实宿主重演。
5. 记录每条输入类别、Host 源码/环境、raw、CEP 解析结果和 code unit；真实 ExtendScript/桥接成功后再裁定 TARGETED_ACCEPTED。内存字符串传输通过不代表所有工程字段都支持这些字符，A01 的无可用 JSON.parse 和特殊属性环境限制独立保留。不重复 A01 六组实测。

下例仅为后续在已确认的真实 CEP Console 执行的只读组合用例；本轮没有执行。可分别将返回行改成实际 stringify 或对独立样本逐项运行，保持回调原值不增加编码层：

```js
var a11Source = '(' + function () {
    var s = "", i, obj = {};
    for (i = 0; i < 32; i++) s += String.fromCharCode(i);
    obj[s] = s;
    return AEToolbox.toJson(obj);
}.toString() + ')()';
new CSInterface().evalScript(a11Source, function (raw) {
    // Preserve the unmodified callback before any parse attempt.
    window.a11Raw = raw;
    try {
        var value = JSON.parse(raw), expected = "", i;
        for (i = 0; i < 32; i++) expected += String.fromCharCode(i);
        console.log({ raw: raw, keyMatches: Object.keys(value)[0] === expected,
            valueMatches: value[expected] === expected });
    } catch (error) {
        console.log({ raw: raw, parseError: String(error) });
    }
});
```

## 文档与停止点

AGENTS 的既有 Git workflow 已简短记录用户确认的 Codex UI/VS Code 终端分工与多行命令约定，不增加自动提交权限。必要当前入口、指导书和机器总账仅同步 A11 实施/离线状态以及 A01 已合并事实；A01 原报告和证据不改。停止在 **IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING**，后续真实验收另行进行。


收尾检查：node scripts/report-i18n-usage.js --check 通过（生成报告最新）；node scripts/check-project-consistency.js 全部通过。git diff --check 与4个新增文件逐个 git diff --no-index --check -- NUL <file> 均无格式错误，JSON 解析及本地 Markdown 链接检查通过。Git LF/CRLF 提示仅为仓库换行策略提示，没有改写历史证据。

差异核对确认生产仅改 jsonEscape/toJson，stringify 定义起至 Host 文件末尾与基线一致（包含 A01 parseJson 和装载逻辑）；52个其他总账条目及 A01 acceptance 对象不变。A01 当前指导书/总账仅补齐本地 Git 已证实的 PR #202、修复提交 b3a6d0b 与合并节点关联，原始报告/证据保持历史字节。暂存区为空；全量回归后生产和测试代码未再修改，只完成文档收束。


## 只读真实 AE/CEP 验收（2026-09-09）

**结论：A11-AE-01 PASS；A11-AE-02 FAIL；A11-AE-03 NOT COVERED（完整组未执行）。** 保持 IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING，但明确本次定向验收因内容断言失败中止；不能改为 TARGETED_ACCEPTED。INTEGRATED_ACCEPTED / CLOSED 仍留待0.3.12-G，不等于可以延后处理此失败而先接受风险。

### 实际环境与装载

从仓库 .debug 读取 AEFT 8088，打开该真实 CEF 调试入口并点击 Lomond Cabinet；本次 target 为 AF0DE4EFCC5889DC2774DB9A8FBA67AA。面板 URL 为 Extensions 下 client/index.html，[文件系统映射记录](vela-0.3.12-b1-a11-real-ae/environment-mapping.json)确认 junction 指向当前工作区；不是普通网页替身。

[环境与原始函数回调](vela-0.3.12-b1-a11-real-ae/ae01-environment-sources.json)记录 AE 26.3x87、ExtendScript 4.5.6、CEP 12.0.1 / Chrome 99、zh_CN，已有 JSON.parse 和 Object.defineProperty 为函数，不凭此判断 JSON.parse 原生来源。getHostLoadInfo 返回7个注册工具、0装载错误、有效目录。[该原回调的 CEP 解析](vela-0.3.12-b1-a11-real-ae/ae01-load-info-cep-parse.json)单独保存，未发起第二次 Host 查询。

实际 jsonEscape、toJson、stringify 的 toString 原始返回与工作树对应函数完整内容一致。[源码比对](vela-0.3.12-b1-a11-real-ae/ae01-source-comparison.json)仅将 CRLF 归一为 LF，并移除源码字符串外侧空白；内部缩进、注释、字面量和逻辑逐字符保持，没有关键词式比对，也未用本地函数覆盖实际 Host。因此允许启动编码矩阵。

### 矩阵与具体停止点

计划采用 suite 的38个样本 × 8条实际编码路径，共304个必需子例，另补引号/反斜线各自独立样本 × 8，共16例；合计320。没有采用离线 suite 的 load-error 注入路径，没有替换全局 JSON。

在 Host 局部内存中用 String.fromCharCode 构造输入，直接返回实际 serializer 的输出。jsonEscape 仅添加必要的外层引号；每个回调先保存 raw，再 CEP JSON.parse(raw)，将字段类型、数组/对象结构、键值字符串长度与 code unit 和 CEP 独立预期逐项比对。未 trim、清洗或重编码 raw，未调用 Host parseJson；保存证据 JSON 容器发生在判定之后。

[逐例原始回调与 CEP 判定](vela-0.3.12-b1-a11-real-ae/ae02-matrix.json)实际记录4例，UTC 08:29:47.011Z～08:29:47.013Z：

| caseId 后缀（均属于 A11-AE-02/C0-0） | raw | 解析 | 内容 |
| --- | --- | --- | --- |
| jsonEscape | 双引号包围的反斜线 u0000 | PASS | PASS：长度1，code unit [0] |
| toJsonValue | value 字段含反斜线 u0000 转义 | PASS | PASS：字符串值长度1，code unit [0] |
| stringifyValue | 双引号包围的反斜线 u0000 | PASS | PASS：长度1，code unit [0] |
| toJsonStringKey | {"":"value"} | PASS | FAIL：期望键长度1/[0]，实际键长度0/[] |

失败命令在局部对象上执行 o[s]="value" 后直接调用 AEToolbox.toJson(o)。原始输出本身是合法 JSON，但键内容与预期不同；这不是 JSON.parse 语法失败。采集器在首个失败后立即保存并停止，未改变输入编码重试，也未用后续成功覆盖失败。

**实际矩阵计数：执行4，PASS 3，FAIL 1，NOT COVERED 316；其中必需304例中未覆盖300，额外16例全部未执行。** 控制字符组合、多语言及其他路径不能从已通过的3例推断通过。实际 Host 原始回调共9条：源码3、环境1、load info 1、矩阵4；不能把9条回调数当作9个矩阵用例。

当前可确定的是内容断言失败。现有证据未在 serializer 前采集 Host 对象键的枚举/code unit，尚未隔离“ExtendScript 对象键构造/枚举已丢失 U+0000”和“后续 serializer/桥接路径丢失”两种归因；不把推测写成引擎事实或产品根因。没有发生被记录的命令解析错误或 EvalScript error，4个被测 raw 均可被 CEP JSON.parse；本次失败分类为 content-assertion。后续若另行授权诊断，应先只读检查 serializer 前的局部键内容，再决定实现修复还是明确宿主限制，本轮不开展后续探针。

### 公共入口、证据与边界

getHostLoadInfo 的实际回调与 CEP 解析已在 AE-01 获得且正常，可保留为 AE-03 的部分证据。getSelectionSummary 未执行，未知 toolId 分支未调用；AE-03 完整组为 NOT COVERED，未伪造无活动合成或工程/选择状态。

[完整 Console 采集命令](vela-0.3.12-b1-a11-real-ae/collection-commands.json)记录实际环境及矩阵命令、目标 URL 和传输方式。命令通过真实 DevTools Console 执行，CSInterface.evalScript 串行回调；CEP 的 require('fs') 仅将证据写到指定目录，采用 wx 防覆盖。辅助 a11Audit 只存在 CEP 内存，没有修改生产方法、工具注册表或 Host 全局解析器。[派生汇总](vela-0.3.12-b1-a11-real-ae/summary.json)与原回调分开，不是额外 trace。

[采集前工作树哈希](vela-0.3.12-b1-a11-real-ae/worktree-before.json)与[采集后核对](vela-0.3.12-b1-a11-real-ae/worktree-after-capture.json)确认所有采集前已有文件在采集期间未变化，包括生产、实施测试、A01/A0/原审计和本轮修复前 JSON/离线输出。之后仅追加本报告、A11 当前状态说明和证据；基线 HEAD 仍为9dee61ee2d2a3ce2f8dd90107fe5343299063eb8，暂存区为空。

未创建图层、改名、写 comment/文字、Undo、切换选择、保存/关闭工程或运行 Provider；未重复 A01 六组测试。没有工程字段写入或全局 JSON 替换。内存字符往返仍不等于所有 AE 工程字段接受这些字符，但当前失败也未被自动豁免为该范围边界。A01 已接受的剩余覆盖裁定及原始证据保持不变。


本次收尾只运行文档/证据检查：9份新增 JSON 解析、本地链接、逐新增文件 git diff --no-index --check、git diff --check、i18n freshness 及项目一致性均通过。采集前快照再次核对，已有文件仅本报告、PROJECT_STATE、VELA_ROADMAP、指导书和总账发生文档变更；生产/测试及历史证据未变。实施轮2307 focused assertions、A01 1122、184/184 suites 未重跑。未执行任何 Git 写操作；当前工作树保留实施轮原有改动，加本次9份证据 JSON 与上述文档更新。


## A11-D1：U+0000 对象键只读分层定位

**停止点：具体归因及处置建议待裁定。A11 仍未 TARGETED_ACCEPTED。** 首次验收的3 PASS / 1 FAIL / 316 NOT COVERED及其原证据完全保留；以下是诊断，不是继续320例矩阵或接受宿主限制。

### 通道、命令与观察方法

沿用 target AF0DE4EFCC5889DC2774DB9A8FBA67AA 的真实 Lomond Cabinet CEP / CSInterface。[D1源码核对](vela-0.3.12-b1-a11-real-ae/d1-source-check.json)再次取得三份实际函数，与此前完整源码及当前工作树一致；仅归一 CRLF 和源码外侧空白。面板环境仍为 AEFT 26.3，本轮没有重启、替换函数、JSON或对象原型。

[实际命令](vela-0.3.12-b1-a11-real-ae/d1-commands.json)共产生23条真实 Host 回调：3条源码、8个单键样本、4个赋值顺序碰撞对照、8个独立 serializer 直接返回。所有被测对象和字符串均在 Host 函数局部构造。第一条采集设置命令因传入 Console 的正则含错误换行产生 SyntaxError，发生在 CEP 命令解析、未触及 Host；[原命令与错误记录](vela-0.3.12-b1-a11-real-ae/d1-command-error.json)保留。修正的只是采集命令转义，不是生产实现或样本内容。

[Host分层观察](vela-0.3.12-b1-a11-real-ae/d1-observations.json)使用固定 ASCII 标签、十进制 code unit、布尔值和分隔符：string:length:units；没有用 toJson/stringify 编码诊断信封。每个样本记录输入 typeof/length/charCodeAt、for-in自有键及值、原s/空字符串/NUL前缀/A/B查找和 hasOwnProperty、实际 jsonEscape(s/k) 及两种 serializer 最终输出签名。ASCII 诊断签名不是 serializer 验收成功证据。

### 已观察事实

| 原s的 code unit | 原s长度 | serializer 前枚举的自有键 | 相关查找 |
| --- | --- | --- | --- |
| [] 空串 | 0 | [] 空串 | 空串为自有键 |
| [65] A | 1 | [65] A | A为自有键，空串不存在 |
| [0] NUL | 1 | [] 空串 | 用原s和空串均读到value，二者 hasOwnProperty 均true |
| [65,0] A+NUL | 2 | [65] A | 用原s和A均读到value，二者为自有键 |
| [0,66] NUL+B | 2 | [] 空串 | 用原s和空串均读到value，B不存在 |
| [65,0,66] A+NUL+B | 3 | [65] A | 用原s和A均读到value，B不存在 |
| [1] U+0001 | 1 | [1] | 键内容完整，空串不存在 |
| [92,117,48,48,48,48] 字面量反斜线u0000 | 6 | 同原s | 字面量键完整，空串不存在 |

每个单键样本均枚举出1个自有键。本环境 Object.keys、Object.getOwnPropertyNames 实际可调用，名称与 for-in 一致；o.reflect.properties 可读取，包含1个自有名称和4个非自有内建名称，逐名签名与 own 标记均保存，自有名称亦一致。没有补 polyfill，不能由“可调用”进一步宣称这些方法均为原生实现。就已观察样本，多个枚举/反射接口交叉确认缩短键名；这并非只凭 o[s] 可读推断完整。

**碰撞证据独立于枚举异常：** 空串与NUL、A与A+NUL+B分别赋 first/second，两种赋值顺序共4例。均只剩1个自有键；两种拼写读取相同值且 own 均true。正常顺序最后赋 second，最终两种读法均为 second；交换顺序最后赋 first，最终均为 first。可确认公开对象操作存在键别名与后写覆盖的数据身份影响，不是单纯 Console 显示或枚举返回名称异常。

### 编码、拼接和桥接分层

原始字符串构造完整。实际 jsonEscape 对原始 NUL 返回长度6、code unit [92,117,48,48,48,48]，即正确转义；A+NUL+B返回长度8，保留A、转义及B。对枚举所得空键/A键，jsonEscape分别返回空串/A；函数接收到的键已与原s不同。U+0001和字面量转义文本正向对照亦保持不同内容，未混淆真正NUL与六个可见字符。

对4个含NUL键样本，Host观察调用内分别计算实际 toJson/stringify 最终输出签名；[8条独立直接回调](vela-0.3.12-b1-a11-real-ae/d1-direct-raw.json)另用同构局部对象调用，直接返回被测 raw。两次调用标签分开，不冒充同一次回调。CEP在回调首先记录raw类型、长度、code unit，然后才 JSON.parse和保存容器。

[派生对照](vela-0.3.12-b1-a11-real-ae/d1-derived.json)确认8/8对 Host内部输出与CEP原回调签名完全相同。NUL、NUL+B在两种serializer均输出空键；A+NUL、A+NUL+B均输出A键，且CEP均可解析。没有trim、替换、重新编码raw或用Host parseJson纠正结果。

**最早已观察不一致：属性建立/查找所暴露的键身份层，早于字符串编码。** 字符串构造没有丢失；枚举前的查找及碰撞已经显示混同，不能仅归为for-in故障。枚举和反射随后暴露相同的NUL前缀名称；实际字符串编码忠实处理所获名称，Host拼接结果和桥接回调一致，CEP内容断言正确揭示与原s不等。

**尚不能区分：** 这些公开接口不能揭示引擎内部究竟在属性名建立/驻留、存储索引还是查找归一化的哪一步使用了NUL前缀；也不证明其他AE/ExtendScript版本相同。可报告当前宿主普通对象键在这些NUL样本上的别名/覆盖行为，不能泛化为所有控制字符、所有对象或平台整体不可达。

### 处置建议与关联风险（待裁定，不实施）

1. 不从空键猜回NUL、不从A猜回A+NUL+B；合法空键/A与含NUL输入已不可区分，serializer事后恢复或一律拒绝空键都会引入错误。没有证据支持继续调整jsonEscape来恢复已丢失身份。
2. 后续裁定应区分字符串编码能力与普通对象键承载能力：保留本次失败及VM正向测试；真实宿主中对不含NUL且身份完整的键继续验收须另行授权，NUL对象键的支持/拒绝边界必须显式决定，不能把本次失败直接改PASS。
3. 若公共输入需要处理含NUL的JSON键，应在解码出键字符串、写入普通对象之前决定拒绝策略，并覆盖空键/前缀碰撞及赋值顺序；若业务必须无损承载这类键，需另行设计显式键值条目表示，超出本轮serializer修复。不要等序列化时才检查已缩短键。
4. 关联风险：本轮真实局部对象证实键碰撞，任何把外来键转换为此类普通对象属性的公共路径都可能面临数据身份混同。**尚未测试实际 A01 parseJson 的现有JSON.parse或回退分支如何处理含NUL键**，也未验证会与具体业务字段/权限字段相撞；这只能作为下一步针对性核查依据，不修改A01已接受历史结论或扩大G-02范围。

本轮仅追加此报告与D1证据，不重写全部入口，不更新路线条目或分支。不操作工程/选择/Undo/Provider，不运行实施测试或全量回归，不执行Git写操作。A11定向验收仍未通过。


D1收尾：[采集前哈希](vela-0.3.12-b1-a11-real-ae/d1-before.json)及[完整性核对](vela-0.3.12-b1-a11-real-ae/d1-integrity.json)确认原有文件仅本报告追加，其余生产、实施测试、首次AE证据、修复前JSON、离线日志及当前入口均不变。D1 JSON、链接、逐新增文件格式、git diff --check、i18n freshness及项目一致性检查通过；暂存区为空。此处检查不包含重新执行离线回归。


## A11-F1：公共 Host 对象键准入补强（关联 A01）

**F1 IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING。** 用户本轮明确批准的新契约：解码后的任意对象成员名含实际 U+0000，拒绝整份公共 JSON 输入，并在建立该属性之前拒绝。这是合法 JSON 的 Host 兼容性限制，不宣称此类成员名违反 JSON 语法。合法空键、普通前缀键、NUL字符串值及字面量反斜线u0000保持语义。A11整体仍未 TARGETED_ACCEPTED；F1不是新路线条目或新增原始审计ID。

### 修复前真实公共入口

沿用既有真实 target AF0DE4EFCC5889DC2774DB9A8FBA67AA，在修改生产文件前调用实际 AEToolbox.parseJson。已取得的 [D1证据](vela-0.3.12-b1-a11-real-ae/d1-derived.json)作为背景，不重复D1或继续引擎内部定位。

[修复前公共入口原始证据](vela-0.3.12-b1-a11-real-ae/f1-before-public-entry.json)含1份实际parseJson源码与9条输入观察；实际源码经外侧空白/CRLF归一后与修改前工作树完整匹配。[命令记录](vela-0.3.12-b1-a11-real-ae/f1-before-command.json)保留输入JSON文本和构造方式。文本在Host中按CEP记录的code unit重建；每个Host原始ASCII签名首先包含实际传入parseJson文本的长度及全部code unit。受限键使用JSON Unicode escape，输入文本中为92/117/48/48/48/48等字符，没有裸NUL；正向字面量键包含两个反斜线。签名不使用serializer推断对象身份。

| 修复前用例 | 实际公共入口结果 |
| --- | --- |
| 单个转义NUL键 | 接受；枚举为空键 |
| 空键/NUL键，两种成员顺序 | 都接受；只剩空键，值均为最后一个成员的second |
| A/A+NUL+B，两种成员顺序 | 都接受；只剩A键，值均为最后一个成员的second |
| outer数组中对象含A+NUL+B键 | 接受；内层枚举键为A |
| NUL字符串值 | 接受；长度1/code unit [0] |
| 合法空键 | 接受；内容保持 |
| 字面量反斜线u0000键 | 接受；长度6/[92,117,48,48,48,48] |

六个受限键输入在修复前均被接受；三个正向对照均保持内容。只证明当前可达的已有JSON.parse分支，不推断其来源，不声称真实无解析器分支已验证。没有修改真实JSON、工具表、工程或权限字段。生产修改后没有在正常Host覆盖函数，也没有运行任何修改后实机验收。

### 实现与契约位置

生产只在 [host/index.jsx](../../host/index.jsx) 的公共parseJson内补强，保留此前jsonEscape/toJson/stringify修复、Vela专用JSON和装载顺序：

- 先把输入固定为一次 String(json) 转换所得text。预检和实际解析均使用同一份text，避免二次toString得到不同输入。
- 新内部admitMemberName检查解码键是否包含String.fromCharCode(0)，抛 SyntaxError，固定信息为 Unsupported Host JSON member name: U+0000，不回显输入正文。
- 已有JSON.parse时，用现有stringValue解码器扫描字符串token；跳过JSON空白后紧跟冒号的token作为成员名进行准入。在有效JSON中，只有成员名满足此关系。扫描只持有字符串与位置，不预建JSON对象、不使用reviver；其余语法仍由已有解析器决定。已有解析器的异常直接传播，不转回退。
- 无解析器时，在key=stringValue()之后立即检查，然后才读取冒号、成员值并调用setMember；含NUL的属性尚未建立。此前局部对象可能已含合法成员，但错误会拒绝整个调用，不返回部分对象或空对象。
- 共用字符串解码器处理Unicode escape、反斜线和引号；不搜索原文片段来判断NUL，不平行新增JSON对象构造器。字符串值中的NUL不会触发成员名限制。无效字符串仍走SyntaxError通路；本轮不保留其错误文本/位置逐字相同的保证。

不改变数值/重复键策略、quota、代理项或业务schema，不试图覆盖任意受信脚本直接给普通对象赋属性。输出serializer不负责从空键/前缀猜测原始含NUL键，也不禁止合法空键。

### 生产模块测试与本轮结果

新增 [F1 suite](../../scripts/test-host-json-member-admission.js)，沿用未修改的完整Host harness。在默认JSON、缺parse、缺JSON三种VM环境中验证开头/中间/结尾NUL键、两类碰撞的双成员顺序、嵌套对象/数组、Unicode组合键及反斜线/引号边界；正向覆盖空键、NUL值、其他31个C0合法转义、多语言与字面量转义文本。

VM独立包装JSON.parse记录委托次数和实际text：14个受限输入均在委托前拒绝，合法输入按原顺序/原文委托；另用抛出sentinel的解析器确认异常不进入回退。监测仅存在于VM，不是实机生产debug seam。VM的NUL属性setter计数为0，源码检查同时确认回退的准入发生在成员值求值与setMember之前。输入toString计数为1，确认预检/解析不交换文本。

实际Ad Component Kit元数据消费者：合法artifact加含NUL成员名后，经实际schema stateAction读取，canRefresh/canRemoveGeneratedComponent均false且工程替身无写入；原合法artifact仍可刷新。不会继续使用截短对象。原 [A01 suite](../../scripts/test-host-json-entry.js) 和 [serializer suite](../../scripts/test-host-json-serialization.js)保持原字节，其中Node直接构造NUL键的serializer正向测试未删除；编码能力与parseJson准入是不同层。

| 本轮命令 | 实际结果 |
| --- | --- |
| node --check scripts/test-host-json-member-admission.js | PASS |
| node scripts/test-host-json-member-admission.js | 224 assertions PASS |
| node scripts/test-host-json-entry.js | 1122 assertions PASS |
| node scripts/test-host-json-serialization.js | 2307 assertions PASS |
| node scripts/test-host-registry-transaction.js | 27 assertions PASS |
| node scripts/run-all-tests.js | 最终生产/测试状态运行一次：发现185、运行185、通过185、skip 0 |

[新的全量原始输出](vela-0.3.12-b1-a11-f1-offline.txt)另存，未覆盖实施轮184/184日志；本表为F1本轮执行，不改旧结果来源。VM覆盖不等于真实ExtendScript无解析器分支覆盖。

### 后续真实复验与原320例逐项处置

[320例逐项清单](vela-0.3.12-b1-a11-real-ae/f1-320-case-disposition.json)逐项保留原caseId、原样本、原期望和首次结果（3 PASS / 1 FAIL / 316 NOT COVERED）；nextResult全部NOT RUN，不补造通过。

- 310例仍须通过编码/内容对照；含NUL的C0-0和C0-combined各有jsonEscape、toJsonValue、stringifyValue三条值路径，共6例，均明确要求保持原长度/code unit，不能因组合样本含NUL而整体跳过。
- 10例为上述两个样本各5条含NUL对象键路径（toJson字符串/数字/布尔键、stringify键、nested）；单列Host普通对象表示限制，关联D1和F1-AE-reject/C0-0、F1-AE-reject/C0-combined的明确JSON输入拒绝用例。这是后续处置计划，未把首次FAIL改PASS，也未自动裁定这些限制可接受。
- 其余非NUL键若出现新的身份异常，仍须报FAIL，不扩大本契约限制。保留原期望可见，不能改期望为空键来使比较通过。

下次先由用户正常保存/重启或确认实际新Host装载，比较真实parseJson与serializer函数源码；不在正常会话中临时覆盖函数。随后执行公共入口小矩阵：复用本节9类输入，增加NUL开头/结尾、对象嵌套及数组内对象，受限键必须在返回对象前抛可识别错误；正向值/空键/字面量键保持。已有JSON.parse和无解析器的实机覆盖分别记录，不全局删改JSON。再按逐项清单完成A11剩余编码以及getHostLoadInfo/getSelectionSummary只读公共返回，不重复D1和A01六组实测。

### 当前状态

当前总账仅在A01/A11添加关联F1说明，A01原TARGETED_ACCEPTED历史裁定和原acceptance对象不改；F1不产生原始审计ID。必要入口标记F1待实机复验，不将A11整体接受或关闭，不进入G-02。工作区中新代码尚未实际装载验收，本轮到离线通过停止，不暂存、commit、push、PR、merge、删分支或tag。


F1收尾检查：i18n freshness、项目一致性、JSON/本地链接、git diff --check及全部未跟踪文本逐文件格式检查通过。[完整性记录](vela-0.3.12-b1-a11-real-ae/f1-integrity.json)与[修改前快照](vela-0.3.12-b1-a11-real-ae/f1-before-worktree.json)确认历史实机证据/修复前JSON/原离线日志及既有实施测试未变；52个其他总账条目和A01 acceptance对象保持。新增生产行为仅parseJson成员名准入；全量回归后生产和测试未再修改。当前HEAD仍为9dee61ee2d2a3ce2f8dd90107fe5343299063eb8，暂存区为空。


## F1新装载复验与A11条件性收束（2026-09-09）

**TARGETED_ACCEPTED / READY FOR COMMIT / PR。** 本次预授权条件均已满足，接受10项含NUL普通对象键为明确的本切片Host支持范围限制。不得表述为320/320往返PASS或支持任意Host对象键。INTEGRATED_ACCEPTED / CLOSED 留待0.3.12-G，B1/0.3.12整体未完成。

### 新环境与完整装载证据

重新从.debug的8088实际调试入口发现Lomond Cabinet，当前target **0E1506349975176A50B0819A49997FD5**，没有复用旧target AF0DE4…。旧浏览器句柄已失效，重新打开发现页后选中当前面板；未要求重复重启或修改Host函数。

[当前环境和四函数源码](vela-0.3.12-b1-a11-real-ae/f1-revalidation-load.json)记录实际AE26.3x87、ExtendScript4.5.6、CEP12.0.1/Chrome99，已有JSON对象且parse为function、defineProperty为function。不推断已有JSON.parse来源。[Extensions映射](vela-0.3.12-b1-a11-real-ae/f1-revalidation-mapping.json)确认junction仍指向当前工作区。

parseJson、jsonEscape、toJson、stringify完整实际函数均与当前工作树相同，仅对源码CRLF→LF及源码外侧空白归一；内部字面量、注释及代码均保留。parseJson实际包含F1准入，没有以版本号、关键词或装载成功替代完整比对。采集代码未替换JSON、对象原型或生产函数。

### F1入口：20/20契约通过

[有限输入清单](vela-0.3.12-b1-a11-real-ae/f1-revalidation-input-plan.json)在发起Host调用前一次保存，来源为F1 suite与修复前公共入口记录。CEP先独立JSON.parse验证20份文本合法性、保存解码键值签名，再将原文本按code unit传到Host；未先在Host对象上建立含NUL键。

负向10例包括：单NUL、开头/中间/结尾NUL、空键/NUL两顺序、A/A+NUL+B两顺序、对象嵌套及数组内对象、C0-combined成员名（部分用例同时覆盖多个条件）。每条都返回accepted=false和完整固定成员名错误信息。正向10例包括原空键/NUL值/字面量键，以及根NUL、含完整C0组合的嵌套值、空键与A、其余31个C0键、多语言、引号/反斜线/冒号边界和Unicode转义反斜线。字段、类型、字符串长度/code unit及数组顺序均核对，合法空键未被禁止。

实际Host返回固定ASCII签名，独立于serializer；回调先保存raw/type/length/code unit，再判定。负向可识别消息完全为 Unsupported Host JSON member name: U+0000。实际异常name记录为Error，未观察内部JSON.parse调用次数；“委托前拒绝”的依据仍是完整实际源码位置加F1实施轮VM监测，不夸大实机能力。

[首段原始记录](vela-0.3.12-b1-a11-real-ae/f1-revalidation-input-results.json)、[接续原始记录](vela-0.3.12-b1-a11-real-ae/f1-revalidation-input-contract-results.json)及[最终契约比对](vela-0.3.12-b1-a11-real-ae/f1-revalidation-input-final.json)分开保存。最终文件前16例链接此前原始回调，后4例含独立输入和回调；没有重复执行前例或覆盖文件。

两次采集器断言差异完整保留：

- 首例正确拒绝，但采集器从Node沿用了异常name必须SyntaxError的额外条件，实际name为Error。用户契约要求可识别的成员名拒绝，不限定name拼写；保留实际name和固定message，以原回调重新核对，未重跑此例。
- 空键与A的枚举次序不同，原签名按次序比较而失败；实际键和值完全相同。对象成员顺序不属于JSON对象内容契约，故按签名中的键和值比较，数组顺序和字符串code unit不放宽。原始签名不改变，未重跑此例。

上述为采集判据过度约束，不是把成员名丢失、普通语法错误或EvalScript error豁免为通过。**实际入口执行20、契约PASS20、FAIL0、NOT COVERED0；负向10、正向10。** 另有2次自动化命令构造语法错误在发送UI前发生，Host调用数0；均与实际命令及采集问题说明一并保留在[命令归档](vela-0.3.12-b1-a11-real-ae/f1-revalidation-commands.json)。

### 编码：310/310，限制10项另列

[实际编码矩阵](vela-0.3.12-b1-a11-real-ae/f1-revalidation-encoding.json)严格从既有320例处置清单选取310例，沿用原caseId，新增runLabel=F1-RE-encoding。包括首次3个PASS及C0-0/C0-combined的全部6个字符串值路径，均重新执行并保持内容。

Host只在局部内存构造字符串，然后直接调用实际serializer，不先经过parseJson。每条返回直接成为CSInterface原回调；先留存raw及长度/code unit，再CEP JSON.parse并比较独立预期。比较对象成员键值时忽略枚举顺序，数组和字符串严格保持；未trim、清洗、补转义或额外包裹被测输出。原raw解码后的证据容器内容与保存的code unit一致。

**实际执行310、PASS310、FAIL0、NOT COVERED0。** 10条含NUL对象键没有重新做直接赋值，原期望不改为空键/A。它们逐项见矩阵excluded及[本次派生汇总](vela-0.3.12-b1-a11-real-ae/f1-revalidation-summary.json)：C0-0的5个键路径关联D1及本次F1-RE-input/single拒绝；C0-combined的5个键路径关联D1及F1-RE-input/C0-combined拒绝。满足用户预授权后接受为Host支持范围限制，**不计编码PASS**，也不扩展到其他非NUL键。

### 公共返回：3/3

[实际公共返回](vela-0.3.12-b1-a11-real-ae/f1-revalidation-public.json)包含源码核对、只读状态保护查询和3个实际入口：

- getHostLoadInfo：ok=true，7个注册工具、0装载错误、有效目录。
- getSelectionSummary：当前真实hasProject=true、hasComp=true、selected=0，返回ok=true/statusId=no-selection/selectedCount=0，与实际条件一致。未伪造无合成。
- runRegisteredToolAction未知工具：先确认 __a11_f1_unregistered__ 在实际表中不存在，并完整比较实际函数源码，确认缺工具分支在任何工具动作解析/调用前返回；实际返回ok=false及 Registered tool not found.。

**公共组执行3、PASS3、FAIL0、NOT COVERED0。** 没有注入load errors、更换注册表、手工信封替代返回或操作工程数据。辅助源码/状态查询不混入3例结果数。

### 裁定边界与历史归属

本轮共341条实际Host回调：装载/环境6、入口20、编码310、公共组及其保护/源码5。333项受验契约结果（20+310+3）均通过，10项支持限制另列；不要与首次320例或原离线断言数混算。两次采集断言差异与两次发送前命令构造错误如上分列，不抹除记录。

首次矩阵3 PASS /1 FAIL /316 NOT COVERED、D1、F1修复前接受碰撞输入的事实，以及184/185两个离线阶段日志均原字节保留。新结论是F1补强后按用户明确契约的有界接受，不重写当时失败。

当前只覆盖已有JSON.parse分支。无解析器回退仍为生产模块VM证据、真实ExtendScript NOT COVERED；特殊__proto__环境仍按继承边界记录。本轮没有找另一套宿主、删除JSON或重复A01六组实测。内存字符串通过不证明所有AE工程字段支持这些字符。A01原acceptance对象及历史报告/证据保持，关联F1说明同步本次结果。

当前HEAD仍为实施基线9dee61ee2d2a3ce2f8dd90107fe5343299063eb8，不是尚未创建的A11/F1修复提交；实际commit/PR关联待用户创建后记录。没有新A11/F1正确性阻塞。到本次文档收束为止，不进入G-02，不暂存、commit、push、PR、merge、删分支或tag。

### 本次文档与证据检查

`node scripts/report-i18n-usage.js --check`、`node scripts/check-project-consistency.js`、`git diff --check`均通过。另对39份未跟踪文本逐文件执行`git diff --no-index --check`，不把已跟踪差异检查当成新增文件检查。33份目录内JSON可解析，358份保存的raw记录（含派生文件对原回调的重复引用，不是358次Host调用）长度/code unit及已保存parsed一致；122个本地Markdown文件链接存在。新增完整性JSON及本节随后单独复查格式。

[本次完整性记录](vela-0.3.12-b1-a11-real-ae/f1-revalidation-integrity.json)对照[验收前快照](vela-0.3.12-b1-a11-real-ae/f1-revalidation-before.json)：474份既有文件中只有8份授权文档变化，生产代码、实施测试及既有证据字节不变；总账其余52项及A01 acceptance对象未变。原A11的184与F1的185套件日志均保留，本次未运行任何离线suite。Git仅作只读核对；修复提交尚未创建。
