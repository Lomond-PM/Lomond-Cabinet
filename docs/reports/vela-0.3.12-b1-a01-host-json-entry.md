# 0.3.12-B1 / A01 — 公共 Host JSON 数据入口生产复核与修复

日期：2026-09-09。

**当前：TARGETED_ACCEPTED / READY FOR COMMIT / PR。INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G；整个 B1/0.3.12 未完成。**

公共 `AEToolbox.parseJson` 的无原生解析器回退已改为不执行输入的严格 JSON 解析。完整生产 Host 模块在隔离 VM 中的修复前反例已确认；修复后，三种 JSON 环境中的合法数据、注册状态读取与相关消费者兼容测试通过。后续六组有界真实 AE/CEP 验收已获用户接受，剩余覆盖及裁定见文末“验收裁定与剩余覆盖”。1122 focused assertions、183/183 suites 复用实施轮结果，本次文档收束未重新执行。

以下实施与分次实机记录保留各自历史时态；其中 PENDING/NOT COVERED 不作为当前切片状态。当前 HEAD 是实施基线，不是尚未创建的修复提交。

## 基线与范围

| 项目 | 本轮实际结果 |
| --- | --- |
| 分支 | `fix/host-json-entry-a01-0.3.12` |
| HEAD | `cd96e0cd65fd485a8f00ac506ee74c0f97fc5e75` |
| 本地 `origin/dev` | 同 HEAD |
| 远端 `refs/heads/dev` | `git ls-remote origin refs/heads/dev` 返回同 HEAD |
| 开始工作树 | 干净；在用户指定任务分支，无须切换或更新分支 |
| A0 | 用户提供 PR #201 合并信息；本地已含 A0 文档。实施使用上述实际 dev 基线，没有退回 `b93d0d8` |
| 包与冻结边界 | package metadata 仍为 0.3.6；Agent architecture 未修改 |

已读取当前 AGENTS、canonical roadmap、[A0 报告中的 A01 / 证据等级 / 下一项](vela-0.3.12-a0-baseline-reconciliation.md)、[R1 指导书中的 B1/A01](../design/vela-0.3-reconstruction-guidance.md)、[原审计 A01](audit-baseline-0.3.11/source-audit.md)。原 ID 保留为 A01；原始总账及审计档案没有修改。

本轮生产改动仅在 [host/index.jsx](../../host/index.jsx) 的公共 `parseJson`。Ad Component Kit 的生产模块与 schema 被实际加载、复核，但无需修改。A11 serializer、G-02 Unicode 参数校验、Detach、坐标转换、Session/Verify、Provider、UI 均未实施。本报告是阶段证据；排期仍只由 VELA_ROADMAP 持有。

## 生产路径与加载顺序

`host/index.jsx` 先定义公共工具基础、registry 和 `parseJson`，随后按原顺序加载 AE/effect/shape 公共工具、隔离 staging 中的 Vela JSON/Context/Execution，再加载 Text Background Box、Ad Component Kit、Shape Add 实现，最后由真实 `loadRegisteredToolFiles` 对 `*.tool.jsx` 排序、执行、验证并提交 registry transaction。修复没有增加 include，也没有改变加载顺序、全局缓存或 Vela bootstrap。

注册状态路径为：

```text
host/tools/adComponentKit.tool.jsx
  registerTool({ id: "ecommerceLayout", stateAction: { hostFunction: ..., intervalMs: 1000 } })
client/js/main.js :: refreshRegistryToolState
  evalHost(toolDef.stateAction.hostFunction + "()")
AEToolbox.tools.adComponentKit.getState
  parseMetadata(selected[0]) -> parseArtifactMetadata -> AEToolbox.parseJson
  findArtifactIdFromSelectedLayers -> parseArtifactMetadata -> AEToolbox.parseJson
```

旧式 comment 由 `parseMetadata` 在包含 `"aetoolbox"` 时交给公共解析器；新式 comment 先剥离 `LOMOND_CABINET_ARTIFACT_V1:`。字段校验发生在解析之后。状态读取走 `stateAction` 的可信 Host 函数字符串，**不走**只处理 `actions` 列表的 `runRegisteredToolAction`。CEP 的受信 `evalScript` 桥接与 `$.evalFile` 模块加载均保留。

对 `host/`、`client/`、`scripts/` 的 `parseJson` 搜索确认，公共入口有以下全部直接消费点（6 个生产文件、10 处调用）：

| 生产模块 | 直接消费者 | 本轮相关兼容验证 |
| --- | --- | --- |
| `host/tools/adComponentKit.jsx` | `paramsFromJson`、`parseArtifactMetadata`、`parseMetadata` | 参数后无 comp 防护；实际 registry stateAction 新旧 metadata / 无效数据 / 重复读取 |
| `host/tools/textBackgroundBox.jsx` | `create` 的参数解析 | 合法参数通过真实 sanitizer 到 undo 边界；无效参数返回原错误信封且未到该边界 |
| `host/tools/shapeAdd.jsx` | `createStrokeFillLayer` 的参数解析 | 合法参数通过真实 sanitizer 到 undo 边界；无效参数返回原错误信封且未到该边界 |
| `host/tools/shapeAdd.tool.jsx` | `normalizeStateResult`、`addRegistryItem` | 实际 no-comp state 包装；参数传递及合法/坏结果 JSON 包装 |
| `host/tools/settingsRendererLab.tool.jsx` | `preview`、`resetSandbox` | 合法嵌套多语言参数往返；无效输入保留空参数默认语义 |
| `host/tools/registryControlLab.tool.jsx` | `previewValues` | 合法嵌套多语言参数往返；无效输入保留空参数默认语义 |

`client/js/coreBootstrap.js` 与 `client/js/vela/velaResponseParser.js` 的同名局部函数不是公共 `AEToolbox.parseJson` 消费者，本轮未修改。

## 修复前生产模块证据

新增 [VM 加载适配](../../scripts/fixtures/host-json-entry-harness.js) 读取完整 `host/index.jsx`，仅移除 `#target`，按相对路径原位展开完整 `#include`，并由 File/Folder/`$.evalFile` 替身加载实际所有注册 schema。没有截取或复制 `parseJson`、元数据函数、`getState`。三种环境均在加载前设置；测试确认 registry transaction 成功且 load error 为 0。

在生产文件尚未修改时运行：

```text
node scripts/test-host-json-entry.js --observe
```

下表为当次工具输出的转录，不是原审计 zip 的输出，也不是真实 AE trace。`--observe` 在当前代码上只报告当前行为，不能据此重新声称执行了旧实现。

反例为 `(__a01Marker += 1, <合法 metadata 对象字面量>)`；标记只在隔离 VM 内存中。新式加固定前缀；旧式对象含 `"aetoolbox":true`。夹具不访问文件、网络、进程，也不调用 AE 工程修改。文件读取只用于测试框架装载仓库源码。

| JSON 环境 | comment 对照 | `canRefresh` | `canRemoveGeneratedComponent` | 每次状态调用标记增量 | 工程写入 |
| --- | --- | --- | --- | --- | --- |
| 原生 parse 可用 | 合法新式 / 合法旧式 | true / true | true / false | 0 / 0 | 0 |
| 原生 parse 可用 | 新式表达式 / 旧式表达式 | false / false | false / false | 0 / 0 | 0 |
| JSON 对象存在、parse 不可用 | 合法新式 / 合法旧式 | true / true | true / false | 0 / 0 | 0 |
| JSON 对象存在、parse 不可用 | 新式表达式 / 旧式表达式 | true / true | true / false | 2 / 1 | 0 |
| JSON 不存在 | 合法新式 / 合法旧式 | true / true | true / false | 0 / 0 | 0 |
| JSON 不存在 | 新式表达式 / 旧式表达式 | true / true | true / false | 2 / 1 | 0 |

新式两次执行来自 `parseMetadata` 和选中 artifact 查找分别读取同一个 comment；旧式仅前一条路径接受其格式。结果支持原审计的条件性假设，证据提升为本轮实际生产模块组合运行；没有证明任何具体 AE 会话缺少 JSON.parse，更不能扩大为打开任意工程即触发。

## 解析器选择与修复

实现前审阅了 `host/vela/velaJson.jsx`：它是后加载、staging 隔离的 Vela 专用解析器，带 32 KiB 输入、8 KiB 字符串、深度 8、数组/属性数量 64 等限制，拒绝重复键、部分普通属性名、负零及孤立 surrogate 等，并服务于 Vela 错误码/信任契约。直接使用会改变普通工具的公开数据兼容性；提取整个共用 JSON 架构又超出本切片。

因此在原公共函数内部增加 ES3 风格递归下降解析，不引入新的全局 API 或模块顺序依赖：

- 原生 `JSON.parse` 是函数时直接调用；其异常向调用者传播，不再尝试任何回退。
- 无原生解析器时处理标准 JSON 的对象、数组、字符串、数字、布尔、null；只接受 JSON 四种空白，要求完整消费输入。
- 字符串识别全部 JSON 转义与四位 Unicode escape，拒绝未转义 C0、非法转义和未闭合字符串；普通嵌套、多语言、合法 code unit 保持数据语义。
- 数字遵守 JSON 语法；负零、重复键后值覆盖、指数及数字范围行为与原生解析对照。没有套用 Vela quota、危险键列表或 Unicode 业务校验。
- 无 `eval`、`Function` 或检查后执行输入的分支；错误使用 `SyntaxError` 和偏移，不回显输入正文。

`__proto__` 的处理维持自身数据属性语义：遇到引擎继承的特殊属性时，使用可用的 `Object.defineProperty` 创建自身数据属性；ES3 引擎没有该特殊属性时按普通键赋值。若引擎既有特殊 setter 又没有可用的安全定义能力，该键失败关闭；普通合法组件元数据不受影响。此窄环境限制已单独测试并保留为实机待核事实，没有把整个工具降级为空对象。测试在完整 Host 加载后才模拟缺少 defineProperty；这不证明既有 Vela bootstrap 能在缺少该能力的宿主启动。

公开签名、调用者已有 catch/default 处理、结果信封、元数据识别逻辑与 serializer 均未改。新增 Host 语法经人工 ES3 复核；Node 语法检查与 VM 运行不冒充 ExtendScript 引擎验证。

## 修复后对照与宿主替身边界

[新增 suite](../../scripts/test-host-json-entry.js) 通过 `run-all-tests.js` 既有 `test-*.js` 自动发现，无需修改发现器。原 `test-host-registry-transaction.js` 在 `parseJson` 定义前截断 Host 源码，适合事务测试，不能承载 A01 完整生产组合；因此保留它并独立新增本 suite。

三种 JSON 环境的结果一致：

| 输入 / 操作 | 修复后实际结果 |
| --- | --- |
| 合法新式 artifact / 旧式 metadata | 识别 controller；新式可移除生成组件，旧式保持原来的 false；与修复前合法对照一致 |
| 普通注释、空 comment、仅提到 `"aetoolbox"` 的普通文本 | 正常状态信封，不识别为组件 |
| 坏 JSON、缺字段/错误 tool 的 artifact、null/空对象 artifact | 不识别为组件，正常状态信封 |
| 表达式、IIFE、嵌入表达式、尾随代码 | 公共解析器拒绝；状态链不能据此识别组件，内存标记 0 |
| 字符串全部合法转义、嵌套数组/对象、多语言、较长字符串/数组 | 与原生 JSON.parse 数据对照相同，不沿用 Vela 数据容量限制 |
| 15 组 comment 各连续读取 4 次 | 每次状态结果稳定，comment 不变，工程写入及 undo 调用均为 0 |
| 无 comp / 无 selection | 保留 `noComp` / `noSelection` 语义 |
| 其他直接消费者 | 参数/结果兼容及无效数据拒绝通过，无输入代码执行 |
| 原生 parser 人为抛出 sentinel | 公共入口保留该异常，未转入回退 |

新旧 metadata 是按实际生产写入格式构造的合法夹具，非从用户 AE 工程采集。VM 完整执行生产源文件、registry 和状态函数，但 File/Folder、CompItem、app、图层/property 为替身；选中图层采用非文本、3D fixture，以隔离元数据读取并避开本轮不审计的几何路径。Proxy 记录并拒绝 fixture layer/comp/project/selection/layers 的写入，另检查原 comment 和重复结果。

普通工具测试中，Text Background Box / Shape Add 合法参数在实际 sanitizer 后由 `beginUndoGroup` sentinel 停止，不模拟创建图层；Shape wrapper 的部分参数/结果用例以其下游 `add` / `getState` 返回值替身划定边界，公共解析器和 wrapper 仍为实际函数。报告中的兼容通过仅覆盖这些相关数据边界，不代表图形创建、AE 属性系统、CEP 计时轮询或 Undo 实机效果通过。

## 实施轮验证记录（本次复用，未重跑）

| 命令 / 检查 | 实际结果 |
| --- | --- |
| `node scripts/test-host-json-entry.js --observe` | 修复前及修复后分别运行，三环境结果如上；只运行本轮实际生产模块夹具 |
| `node scripts/test-host-json-entry.js` | 最终 focused：1122 assertions PASS |
| `node scripts/test-host-registry-transaction.js` | 27 assertions PASS |
| `node scripts/run-all-tests.js` | 最终生产/测试代码执行一次：183/183 runnable suites PASS；0/183 discovered suites skipped |
| `node --check scripts/test-host-json-entry.js` | PASS |
| `node --check scripts/fixtures/host-json-entry-harness.js` | PASS |
| `Get-Content host/index.jsx \| Where-Object { $_ -notmatch '^#(target\|include)' } \| node --check` | PASS；预处理指令剥离后的语法检查，完整 includes 另由 VM 实际加载 |
| `node scripts/report-i18n-usage.js --check` | up to date，无需重生成 |
| `node scripts/check-project-consistency.js` | All project consistency checks passed |
| `git diff --check` 及新增文件单独 `git diff --no-index --check` | PASS；后者覆盖新 suite、fixture 和本报告，不仅检查已跟踪差异 |

新增文件以 `NUL` 为空文件对照；本环境 `--no-index --check` 返回 1（存在文件差异），stdout 无空白错误，不能把这个差异状态码当成格式失败或零退出码。Git 同时提示以后 checkout 时 LF 会转 CRLF，这是仓库行尾策略提示；本轮未重写归档行尾。

全量控制台原始日志留在本地忽略目录 `.tmp/a01-final-offline.log`；不将它或既有 qualification 本地证据误称为本轮真实 Provider/AE 验证。没有运行真实 Provider、原审计摘录探针或 Vela forward/reverse/forward 专项；公共加载顺序与 Vela global/cache 语义未修改。历史 182/182 与 94/94 ×3 保留历史归属，不作为本轮重新执行的计数。

仅更新五个当前入口中与本切片有关的状态和报告链接；A0 历史报告、原始审计文件/证据 zip、冻结 architecture、包版本及其他生产模块不变。未暂存、commit、push、创建 PR、merge 或 tag。

## 实施结束时拟定的真实 AE 验收步骤（历史）

本轮没有操作 AE。以下需要下一轮在实际宿主执行、记录环境及原始结果，才能决定是否关闭 A01：

1. 确认 CEP Extensions junction 指向本任务工作区，记录 AE 版本、CEP/系统、工作区分支与实际代码 diff。重启 AE 后打开面板，避免缓存旧 JSX。通过现有可信 Host 调试通道读取 `AEToolbox.getHostLoadInfo()`，确认 registry 无 load error。
2. 读取实际 Host 的 `typeof JSON` 及 `typeof JSON.parse`（先保护 JSON 未定义/null 情况），记录结果；读取 `String(AEToolbox.parseJson)`，确认已装载本切片的严格回退实现（包含 `Invalid JSON at position`，没有旧的数据 `eval` 回退）。仅凭面板显示或固定 `hostFile` 字段不足以证明新代码装载。
3. 在可丢弃测试工程中保留一份合法旧式组件及一份合法新式 artifact，逐一选中 controller，打开 Ad Component Kit，记录实际 stateAction 返回值和按钮状态；重复读取，检查 componentType、旧/新能力差异与原有语义一致。读取前后比对 comment 和工程修改状态；状态查询不应触发 undo 或修改工程。
4. 同一可丢弃工程中检查普通中文注释、空注释、无选中层、无活动 comp，以及坏 JSON / 错误 tool / 缺 artifactId 的元数据。预期正常状态信封、无有效组件状态；comment 原样保留。
5. 如需检查非 JSON 输入，仅在该可丢弃工程放置无副作用的非 JSON 表达式或尾随无效字符；禁止访问文件、网络、进程的载荷。工程完成后不保存到用户日常资产。合法转义、多语言及嵌套数据可另作只读 `AEToolbox.parseJson` 正向对照；不要让控制字符 serializer 的 A11 问题混入 A01 结论。
6. 不在日常 AE 会话全局删除或替换 JSON。若实际宿主原生 parse 可用，实机报告只能证明该宿主分支；无原生分支继续标注为 VM 已验证、真实 ExtendScript 待验证。确需覆盖该条件时，应使用独立可丢弃的脚本引擎/测试宿主隔离加载实际模块并另行记录，不改变正常会话全局环境。

关闭标准：实际 Host 新代码装载、JSON 可用性条件、真实注册状态入口的新旧合法兼容与无效拒绝、重复读取零工程副作用均有可追溯证据；对未覆盖的无原生宿主条件作明确验证或风险裁定，再按原 A01 ID 更新规范/总账状态。当前证据不足以 CLOSED；本轮停在 **IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING**，不自动进入 A11、G-02 或后续重构。

## Targeted real AE/CEP acceptance — 2026-09-09

本节是后续实机任务的追加记录；上文1122 focused assertions、183/183 suites均为实施轮结果，本次未重跑，也不作为实机证据。状态继续为 **IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING**；实机仅部分覆盖，A01 未 CLOSED。

### 环境、授权与采集方式

沿用 `fix/host-json-entry-a01-0.3.12`，HEAD 仍为 `cd96e0cd65fd485a8f00ac506ee74c0f97fc5e75`。开始时生产差异仍仅为 `host/index.jsx` 的139行新增/2行删除，内容与上一轮实现一致；本次开始/结束对该文件及两份测试/fixture 的 SHA-256 比对一致，未修改生产或测试代码。详见 [工作区及函数内容比对](vela-0.3.12-b1-a01-real-ae/workspace-verification.json)。

用户补充：“已打开ae测试工程，使用你的内置浏览器的devtools，我期间将要离开电脑，需要ae实际操作的地方跳过并报告”。据此只执行真实 CEP DevTools 中的只读 Host 查询、无副作用解析对照、现有选择的状态读取与 CEP 工具页导航；未写入 comment、未建立夹具、未切换 AE 选择/活动 comp、未创建图形或执行 Undo。用户确认了打开测试工程，没有单独提供保存/重启完成的确认；本次以实际装载函数内容比对证明装载，不将重启过程记为已观察。

调试端口来自仓库 `.debug` 的 AEFT 配置8088，非端口猜测。HTTP target 列表返回真实 `Lomond Cabinet` / `file:///.../CEP/extensions/com.kevin.aetoolbox/client/index.html`；随后全部实机查询经内置浏览器中的该 target DevTools Console、实际 `CSInterface.evalScript` 执行。不是 Node VM 或普通页面替身。CEP Node 的文件能力仅在回调侧直接保存证据；被测非法输入没有文件、网络、进程或工程操作。

- [Extensions 映射原始采集](vela-0.3.12-b1-a01-real-ae/extension-mapping.json)：用户目录中的 Extensions 路径为 junction，目标是本工作区。
- [AE-01 环境与 Host 原始返回](vela-0.3.12-b1-a01-real-ae/ae01-host.json)：AE `26.3x87`，CEP user agent `AdobeCEP/12.0.1` / Chrome `99.0.4844.84`，AEFT，`zh_CN`；测试工程 `D:\Projects\Vela Test\Vela Test.aep`，活动合成 `Test Comp`。
- Host registry 为7个工具、load errors 0、catalog valid、last attempt succeeded。`typeof JSON === "object"`、`typeof JSON.parse === "function"`、`typeof Object.defineProperty === "function"`。
- [实际公共函数原文](vela-0.3.12-b1-a01-real-ae/ae01-source-0.json)与磁盘实现进行完整字符串比对：仅统一 CRLF、去边界空白，并从磁盘侧去掉赋值前缀/结尾分号，结果相同；不是仅比版本号或关键字。[已有 JSON.parse 内容](vela-0.3.12-b1-a01-real-ae/ae01-source-1.json)返回 `[compiled code]`。本次覆盖公共入口的**已有 JSON.parse 分支**，不额外推断该函数的安装来源。

含 `hostRaw` 的 `ae*.json` 记录实际 Host 输入、时间及未经改写的回调字符串；UI/控件专用文件不含 Host 回调，由真实 CEP 回调直接写入，不是手工转录或 CDP wire archive。`workspace-verification.json`、`extension-mapping.json` 是本地只读核对，`derived-summary.json` 是对已保存回调的派生比对；三类证据明确分开。DevTools 抓屏曾在工具输出中观察，未另存截图文件，不能声称具备独立屏幕录像。

### AE-01～AE-06 结果

| 用例 | 结论 | 实际完成与缺口 |
| --- | --- | --- |
| AE-01 宿主与装载 | **PASS** | 真实 target、junction、AE/CEP 环境、Host load info、JSON/defineProperty 可用性和完整函数内容比对通过；重启过程未观察 |
| AE-02 公共解析入口 | **PASS（已有 JSON.parse 分支）** | 五组安全输入的合法接受/无效拒绝符合预期；返回值与异常保留原文；无原生回退不在此 PASS 范围 |
| AE-03 新旧元数据 | **NOT COVERED** | 读取到工程既存的新式 artifact 注释，但未选中这些 controller；未加载旧式样本或构造夹具，不能用现有普通选择状态代替新旧组件验收 |
| AE-04 无效与空状态 | **NOT COVERED（空 comment 子例 PASS）** | 现有选中图层 comment 为空，状态信封正常且未识别为组件；中文普通注释、无选中、无活动 comp、坏 JSON/错误 tool/缺 artifactId 的元数据状态路径均未实机覆盖 |
| AE-05 重复读取 | **NOT COVERED（现有选择的读取稳定性 PASS）** | 真实 stateAction 连续3次采样；已采集图层/合成字段、状态返回和 UI 文本稳定。缺新旧/无效夹具矩阵及原生 Undo 观察；不据此宣称任意状态读取零写入 |
| AE-06 普通工具最小 smoke | **NOT COVERED** | 用户离开，按补充要求跳过 Text Background Box、Shape Add 原生创建结果和 Undo 确认；未尝试创建，不记作失败或通过 |

没有发现上述已执行 A01 对照的产品失败。初次环境采集 Console 命令因嵌套引号出现浏览器 `SyntaxError`，尚未调用 Host；改为由函数文本构造查询后成功。该采集命令错误不记为 AE-01 产品失败，也没有修改生产实现。

### AE-02 原始对照

[输入与回调原文](vela-0.3.12-b1-a01-real-ae/ae02-parser.json)：

| 类别 | 实际结果 |
| --- | --- |
| 合法嵌套、多语言 | `name` 为 `中文 日本語`，items 为 `[1,true,null,{"n":-250}]` |
| 合法字符串转义 | code units 为 `[34,92,47,8,12,10,13,9,0,20013]`，分别对应 quote、反斜杠、斜杠、backspace、form feed、LF、CR、TAB、NUL、中文“中” |
| 坏 JSON `{broken}` | 拒绝；实际 `errorName: "Error"`、`errorMessage: "JSON.parse"` |
| 无副作用非 JSON 表达式 `(1+2)` | 同上拒绝 |
| 尾随无效内容 `{} xyz` | 同上拒绝 |

实机已有解析器的错误名是 `Error`，与离线 Node 原生解析器的 `SyntaxError` 名称不同；公共入口按原约定直接传播该错误，没有回退。本轮用 code units 验证控制字符结果，没有让 A11 serializer 的未处理问题进入 A01 判定。

### 状态路径、样本与可观测边界

[既存工程/注册入口原始返回](vela-0.3.12-b1-a01-real-ae/ae03-existing-state.json)记录了 schema 的 `stateAction.hostFunction = AEToolbox.tools.adComponentKit.getState`、intervalMs 1000。只读查询按实际 schema 解析目标并调用，未使用 `runRegisteredToolAction`。

当前 `Test Comp` 有26层，选中第26层 `Vela E2E Target`，comment 为空。工程内第3/4层另有 `ICON_GRID_CTRL` / `FEATURE_STACK_CTRL` 新式 artifact 注释，注释日期分别为2026-08-07、2026-08-06；来源是工程现存内容，非本轮构造或具有独立创建 trace 的历史认证样本。它们没有被选中走本轮新式 controller 状态用例，不能宣称 AE-03 已通过。上一轮 fixture 的新式 true/true、旧式 true/false 预期仅适用于对应 fixture，不泛化到这些未测组件。

通过真实 Home 控件的既有 pointer 事件进入“电商组件工具箱”，未改导航或状态生产方法。真实页面抓屏显示活动合成 Test Comp、选中1、文本0、2D图层1、控制器不可用、可移除生成组件 false，与 Host 状态对应。初始 `button.click()` 没有导航效果，检查到该控件原本使用 pointerdown/up 导航后使用其现有事件路径，不作为产品故障。

[AE-05 三次原始采样](vela-0.3.12-b1-a01-real-ae/ae05-repeated-state.json)时间为 UTC `04:39:38.839`、`04:39:40.173`、`04:39:41.511`，即本地12:39。页面准备完成后才建立采样基线，每次记录调用前/后：

- 合成 id/name/comment、宽高、duration/time/frameRate、层数，以及工程 item 数与可读 dirty 值。
- 26层的 index/name/comment、selected、parent、3D/enabled/locked、startTime/inPoint/outPoint，及 anchor/position/scale/rotation/opacity 的当前值、key数量、expression和启用状态。
- 实际状态函数回调原文、真实页面文本和可见按钮的 disabled 属性。

三次调用内与跨调用的数据快照相同，状态返回及页面文本相同；全程没有本轮夹具写入或 AE 选择切换。[派生比对结果](vela-0.3.12-b1-a01-real-ae/derived-summary.json)只比较这些已保存数据，不重新执行 Host/VM 测试。页面已进入原有状态轮询场景，但没有拦截或包装生产方法采集每一次自动轮询调用，不能把三次显式读取冒充完整轮询 trace。也没有遍历全部工程数据、所有属性/关键帧值或获取原生 Undo 栈；相同快照仅说明已观察字段无变化，不证明未发生同值写入。UI/Undo 用户确认本轮为 **NOT COVERED**。

### 未覆盖条件与停止

无原生 JSON.parse 回退继续为 **VM PASS / REAL EXTENDSCRIPT NOT COVERED**。没有全局删除/替换 JSON，也没有新增生产 debug seam。`__proto__` 在特殊 setter 存在但安全定义能力不可用时的明确拒绝，仍仅有上一轮模拟环境证据；本轮 defineProperty 可用且走已有 JSON.parse，没有触发或覆盖该条件，不将拒绝伪装为成功解析。

后续仍需有人在场完成 AE-03 新旧 controller 样本/夹具、AE-04 其余状态（尤其真实无活动 comp）、AE-05 夹具矩阵及 Undo、AE-06 两个普通工具的实际创建/Undo，并裁定无原生宿主覆盖。用户离开时要求跳过的用例不补写 PASS。

本轮只追加本节与实机证据文件；未重跑 focused/全量回归，未修改生产、测试、五个状态入口、冻结架构、原始审计档案或包版本，未暂存/提交/推送/创建 PR。证据 JSON 可解析、各报告链接存在、文档及新增证据格式检查通过；原始 `hostRaw` 字符串保持采集内容。A01 不改为 CLOSED，不进入 A11/G-02。

### 用户返回后的接续：AE-03 新式工程样本

用户返回并确认已在 Test Comp 中仅选中 `ICON_GRID_CTRL`；这次选择属于用户准备操作，与后续只读查询分开。同一真实 CEP target 查询确认选中第3层、实际 stateAction 为 `AEToolbox.tools.adComponentKit.getState`。工程现存 `iconGrid` 新式 artifact 的返回为 `selectedControllerType: "iconGrid"`、`canRefresh: true`、`canSelectLayers: true`、`canDetach: true`、`canRemoveGeneratedComponent: true`；comment 读取前后相同。

原始输入、回调、页面文本及按钮状态保存在 [ae03-existing-icon-grid.json](vela-0.3.12-b1-a01-real-ae/ae03-existing-icon-grid.json)。真实页面对应刷新、选择组件图层、移除生成组件按钮可用；没有点击这些动作。该**新式工程样本子例 PASS**，不覆盖其他组件类型；AE-03 整体仍待旧式合法夹具，AE-04～AE-06其余缺口继续保留。此次未修改生产代码或工程数据。

### 接续：AE-03 旧式构造夹具

用户确认已新建并选中 `A01_METADATA_FIXTURE`。[准备前原始查询](vela-0.3.12-b1-a01-real-ae/ae03-legacy-preparation-before.json)确认仍在指定测试工程/Test Comp、唯一选中 null layer、layer id 190、comment 为空、无 parent。写入时再次保护项目路径、合成、唯一选择、层名/id/nullLayer和空 comment；仅向该层写入与离线 fixture 相同的合法旧式对象：`aetoolbox:true`、`componentId:"legacy_fixture"`、`componentType:"featureStack"`、`role:"controller"`、`index:0`。该数据为本轮构造夹具，不是历史工程样本。

[准备写入记录](vela-0.3.12-b1-a01-real-ae/ae03-legacy-preparation-write.json)单独记录 comment 的空值→metadata 变更及 undo group `A01 Prepare Legacy Fixture`，不将准备操作混入零写入结论。随后另一条只读命令经实际 schema 的 stateAction 读取，[原始回调与 UI 状态](vela-0.3.12-b1-a01-real-ae/ae03-legacy-state.json)显示 `selectedControllerType:"featureStack"`、`canRefresh:true`、`canSelectLayers:true`、`canDetach:true`、`canRemoveGeneratedComponent:false`；页面对应刷新/选择可用、移除禁用，comment 读取前后相同。

旧式子例 **PASS**。结合前述工程现存新式 iconGrid 样本，**AE-03 在这两个明确来源/类型的样本范围内 PASS（已有 JSON.parse 分支）**，不泛化到所有组件或创建/刷新行为。夹具保留选中，准备下一项重复读取与 Undo 观察；尚未执行撤销，也未把 Undo 标记通过。AE-04、AE-05其余覆盖与AE-06仍待接续，A01 未 CLOSED。

### 接续：AE-05 旧式夹具 Undo 基线

用户提供了原生 AE 编辑菜单截图，第一项为“撤消 A01 Prepare Legacy Fixture”，文字呈启用状态，快捷键 Ctrl+Z。截图按原字节保存为 [用户提供的读取前 Undo 菜单](vela-0.3.12-b1-a01-real-ae/ae05-legacy-undo-before-user.png)，SHA-256 为 `964c2694f05d538141b6f8c3bcec0b4f3bf62f4dd58aa4cc0f2d00cd5e68b4be`。这是夹具准备完成后的用户截图证据，不是自动抓取的 Undo 栈或撤销执行结果；尚待菜单收起后的重复读取及读取后菜单对照，AE-05 不提前标为 PASS。

用户确认菜单已收起后，执行旧式夹具3次只读采样，分别在 UTC `06:13:48.971`、`06:13:50.304`、`06:13:51.644` 返回。每次保护 Test Comp、唯一选择、layer id 190/名称和完整旧式 comment，然后经真实 schema stateAction 读取；没有 comment 写入、选择变更、undo group 或撤销操作。[原始采样](vela-0.3.12-b1-a01-real-ae/ae05-legacy-repeated-state.json)保留输入、Host 回调、UI 文本和按钮状态；[派生比对](vela-0.3.12-b1-a01-real-ae/ae05-legacy-derived-summary.json)确认27层已采集字段及合成字段在调用内、跨调用均相同，state/UI均稳定。数据覆盖沿用上述有限快照边界，不证明全部工程字段或同值写入情况。读取后原生 Undo 菜单仍待用户对照；该子例的 Undo 结论未提前通过。

用户随后提供[读取后 Undo 菜单截图](vela-0.3.12-b1-a01-real-ae/ae05-legacy-undo-after-user.png)，仍显示 `A01 Prepare Legacy Fixture` 撤销项且可用，与读取前一致；截图 SHA-256 为 `0550699ab36d7ce6fc4f75bd871f47ae6bf00c56a9fdd84de33897db8a5a8aa2`，按原字节归档。由此，**AE-05 旧式夹具子例在已采集数据、UI稳定性及可观察的 Undo 菜单范围内 PASS**。用户截图观察与 Host 原始回调保持分开；未实际执行撤销，也没有读取完整 Undo 栈，不据菜单相同证明不存在同值写入。此前派生文件中的 `PENDING USER OBSERVATION` 保留其采样时态，当前对照结论以此追加记录为准。AE-04其余状态、新式/无效数据重复读取覆盖及AE-06仍待接续；A01 未 CLOSED。

### 接续：AE-04 普通注释与无效元数据矩阵

用户确认编辑菜单已收起后，仅在指定测试工程的 `A01_METADATA_FIXTURE`（id 190）执行7组构造输入：普通中文注释、空 comment、新式前缀加坏 JSON、错误 tool、缺 artifactId、新式前缀加无副作用表达式 `(1+2)`、合法形状的新式对象尾随 ` xyz`。后两类没有任何外部或工程副作用载荷。每次准备写入均检查项目路径、合成、唯一选择、层名/id/nullLayer及预期旧 comment，使用独立命名 undo group；写入后等待1200 ms，再经真实 schema stateAction 执行两次独立只读查询，间隔1200 ms。未改生产函数、JSON 或 app 对象。

[完整原始记录](vela-0.3.12-b1-a01-real-ae/ae04-comment-matrix.json)含22条带时间与输入的 Host 回调：7次准备、14次读取、1次恢复，`PREPARATION` 与 `READ_ONLY` 明确区分；读取同时保存真实页面文本。[派生比对](vela-0.3.12-b1-a01-real-ae/ae04-comment-derived-summary.json)显示每组均返回正常 `ok:true` 状态信封、controller 为 null、canRefresh/canRemoveGeneratedComponent 为 false；组内两次 state/UI相同，27层已采集 comment/身份/选择/parent/transform及合成字段在调用内和两次调用间均相同。7组**状态子例 PASS（已有 JSON.parse 分支）**；这是构造夹具范围，不是全部非法元数据的穷举证明。

成功完成后通过独立 `A01 Fixture restore-legacy` undo group 恢复本轮开始前的旧式 metadata，最后回调确认 comment 完全相同；没有保存工程或执行撤销。准备/恢复本身会留下撤销记录，不属于被测读取。该矩阵未逐组取得原生 Undo 菜单证据，不能将旧式夹具的菜单结论直接继承至全部无效用例；数据观察仍受有限快照/同值写入边界限制。AE-04 的无选中、真实无活动 comp 仍待用户原生操作；AE-05其余覆盖、AE-06继续待验收。

### 接续：AE-04 无选中图层

用户在 AE 中取消选择后，UTC `2026-09-09T06:21:04.370Z` 的[真实 Host 原始回调及页面文本](vela-0.3.12-b1-a01-real-ae/ae04-no-selection.json)确认活动合成为 `Test Comp`、`selectedLayers.length:0`。经 schema 指定的 `AEToolbox.tools.adComponentKit.getState` 返回 `ok:true`、`messageKey:"tools.adComponentKit.state.noSelection"`、`hasComp:true`、controller 为 null，创建/刷新/选择组件/Detach/移除能力均为 false。真实组件页面显示选中数量0及“没有选中图层。”；调用前后全部图层的 id/comment/selected 快照一致。

**AE-04 无选中子例 PASS**。用户取消选择属于准备操作；本次只读查询没有改写 app、comment 或选择，不据有限快照推断完整工程零写入或 Undo 栈。真实无活动 comp 条件尚未建立，AE-04 整体及后续未覆盖项继续待验收；本次未重跑离线测试。

### 接续：关闭时间线后的真实 activeItem 核验

用户关闭时间线中所有合成，并指出此操作不一定令 AE 进入无活动合成状态。UTC `2026-09-09T06:25:27.258Z` 的[原始查询](vela-0.3.12-b1-a01-real-ae/ae04-active-item-after-close-tabs.json)确认 `app.project.activeItem` 仍为 `CompItem`，名称 `E Test 1`，并非 null。真实 stateAction 正常返回 `hasComp:true`、`noSelection`；组件页同样显示 E Test 1、选中0。已采集工程 item 与合成图层 id/name/comment/selected 在读取前后相同。

因此本次准备**未达成无活动 comp 条件**，不记为该子例 PASS，也不判为解析器故障。未改写 app 或生产方法；后续需用户原生操作后再次核验。

### 接续：AE-04 以真实 FolderItem 达成无活动合成

用户在项目面板选中已有 `Assets` 文件夹。UTC `2026-09-09T06:28:17.759Z` 的[原始 Host 查询与页面文本](vela-0.3.12-b1-a01-real-ae/ae04-assets-folder-state.json)确认 `activeItemName:"Assets"`、`activeItemIsFolder:true`、`activeItemIsComp:false`、`activeItemIsNull:false`。这是用户原生选择产生的真实 FolderItem 条件，没有改写 app。生产 `getComp()` 仅接受 CompItem，因此实际 stateAction 返回 `ok:true`、`messageKey:"tools.adComponentKit.state.noComp"`、`hasComp:false`、`activeComp:""`，全部能力布尔值为 false；真实组件页显示激活合成不可用及“请打开合成”。

读取前后已采集工程 item 的 id/name/comment/selected，以及各合成图层的 id/name/comment/selected 均相同。**无活动合成子例 PASS（非 CompItem 分支）**；未覆盖 `activeItem === null` 或无工程的独立条件，不把 FolderItem 描述为空值。结合前述7组注释/无效元数据及无选中子例，**AE-04 在本轮明确条件范围内 PASS**。有限字段快照不证明完整工程零写入，亦未新增 Undo 结论。AE-05其余覆盖与AE-06仍待接续，A01 未 CLOSED。

### 接续：AE-05 新式组件读取前 Undo 基线

用户确认重新打开 Test Comp 并选中 ICON_GRID_CTRL，随后提供原生 AE 编辑菜单截图，显示“撤消 A01 Fixture restore-legacy”可用。截图按原字节保存为[新式组件读取前用户 Undo 截图](vela-0.3.12-b1-a01-real-ae/ae05-new-style-undo-before-user.png)，源文件与归档文件 SHA-256 均为 `11e2e3c8b6279081608ee309d01d99ea832676939aa1a5bb35369a2523e10da0`。

这是用户截图观察，撤销项对应此前无效元数据矩阵的夹具恢复准备操作。尚未开始本次新式组件重复采样，也未执行撤销；待用户收起菜单后核对实际选中项并采样，读取后 Undo 对照仍待取得，不提前标记该子例通过。

用户确认菜单已收起后，经实际 schema stateAction 对 Test Comp 的 ICON_GRID_CTRL（唯一选中，id 171）完成3次只读采样，UTC 时间为 `06:33:05.123`、`06:33:06.461`、`06:33:07.794`。[原始输入与回调、页面及按钮状态](vela-0.3.12-b1-a01-real-ae/ae05-new-style-repeated-state.json)和[派生比对](vela-0.3.12-b1-a01-real-ae/ae05-new-style-derived-summary.json)确认27层及合成的既定有限快照在调用内、跨调用均相同，state/UI/按钮状态稳定；controller 为 iconGrid，canRefresh/canSelectLayers/canDetach/canRemoveGeneratedComponent 均为 true。快照沿用此前已审阅的只读采集函数，仅替换选中项保护；状态逻辑仍调用真实生产模块，没有复制解析器或 getState。

首次 Console 命令因嵌套字符串转义在浏览器解析阶段出现 `SyntaxError: Unexpected identifier`，未发起 Host 调用或生成采样文件；改用函数源码构造后完成上述采样。这是采集命令错误，不是生产解析器失败。全程未修改工程数据、选择或生产方法。读取后原生 Undo 菜单仍待用户截图对照，不提前标记该子例完整通过；数据相同不证明不存在同值写入或完整 Undo 栈变化。

用户提供[新式组件读取后 Undo 菜单截图](vela-0.3.12-b1-a01-real-ae/ae05-new-style-undo-after-user.png)，仍显示“撤消 A01 Fixture restore-legacy”且可用，与读取前一致。源文件与归档文件 SHA-256 均为 `21b51d2dd3dd0d6b66435f9569aab722c9960e85410d4fbf74f1e74eb4a4b26c`。因此 **AE-05 新式 iconGrid 工程样本子例在已采集字段、UI/按钮稳定性及可观察 Undo 菜单范围内 PASS**。该截图为用户提供的原生 UI 证据，未实际执行撤销，未观察完整 Undo 栈；不据此宣称全部工程数据或同值写入不可发生。

新式工程样本与旧式构造夹具均已完成重复读取及前后 Undo 菜单对照；无效/普通/空注释矩阵已完成重复读取和有限数据比对，但未逐组取得 Undo 菜单证据，该限制保留。AE-06 两个普通工具的正常动作与实际 Undo 仍待执行，A01 维持验收待完成，不修改总账为 CLOSED。本次仅追加报告与原字节截图，未执行离线回归或修改生产实现。

### 接续：AE-06 普通工具 smoke 准备基线

用户原生新建 A01_TOOL_SMOKE 合成和文字层，并确认退出文字编辑、仅选中文字层。[操作前真实 Host 基线](vela-0.3.12-b1-a01-real-ae/ae06-text-background-before.json)于 UTC `2026-09-09T06:37:29.424Z` 确认当前仍为指定可丢弃测试工程，合成 id 191、800×800、30 fps、时长1帧、时间0；仅1个文字层 id 203，文本 `A01 中文 Smoke`，空 comment、无 parent、2D、已选中。原始输入与回调记录了文字字体/字号和有限 transform 字段。合成及文字创建属于用户准备操作，本次查询只读，背景框动作尚未执行，不标记 smoke 或 Undo 通过。

### 接续：AE-06 Text Background Box 实际面板创建

助手在真实 CEP 工具页读取并保存[当前控件值](vela-0.3.12-b1-a01-real-ae/ae06-text-background-controls.json)：Padding X 40、Padding Y 25、圆角35、启用黑色纯色填充/不透明度100、关闭描边，未改参数。经[创建前真实 Host 保护查询](vela-0.3.12-b1-a01-real-ae/ae06-text-background-click-guard.json)确认合成 id 191、仅1层且唯一选中 id 203 后，点击一次真实 `data-dynamic-action="create"` / `textBackgroundBox` 按钮，由既有面板事件处理调用注册动作。没有替换或包装生产方法。

[点击后页面记录](vela-0.3.12-b1-a01-real-ae/ae06-text-background-ui-after-click.json)于 UTC `06:40:51.522Z` 显示“已创建圆角矩形。”；[随后只读 Host 原始返回](vela-0.3.12-b1-a01-real-ae/ae06-text-background-after.json)确认合成层数1→2，新增 ShapeLayer id 204 / `A01 中文 Smoke_BG`，位于原文字层之后、parent 指向文字层 id 203。原文字层已采集字段仅 selected 从 true 变为 false，新增背景层选中。该后置查询复用了准备快照源码，其内层 `phase` 仍为 `PREPARATION_BASELINE_READ_ONLY`；实际采集时态以外层 `AE-06-text-background-post-action-read-only` 标签和时间为准，原始回调不改写。

本次取得的是实际按钮操作后的页面消息与独立 Host 查询回调，未截获创建动作自身的原始返回，不能将页面成功文案冒充该返回。创建数据符合本子例预期；实际 AE 外观及原生 Undo 执行仍待用户确认，暂不标记该工具完整 smoke PASS，也不据单个普通动作宣称全部公共解析消费者已实机覆盖。

用户回复背景框外观与一次 Ctrl+Z“均正常”，作为用户手工确认记录。UTC `06:43:42.209Z` 的[撤销后真实 Host 返回](vela-0.3.12-b1-a01-real-ae/ae06-text-background-after-user-undo.json)确认新增背景层已移除、原文字层 id 203 保留，全部已采集合成/图层字段与创建前基线相同。**AE-06 Text Background Box 子例 PASS（实际面板创建、用户外观确认、用户执行 Undo 与 Host 后置核验）**，不扩展至其他参数矩阵。

### 接续：AE-06 Shape Add 实际面板创建

助手经真实主页返回按钮与 shapeAdd 卡片既有 pointer 事件进入“AE绘画领域大神”，记录[控件与状态](vela-0.3.12-b1-a01-real-ae/ae06-shape-add-controls.json)。当前文字选择使原生组件添加按钮禁用，属于非形状目标正常状态；“新建描边 / 填充图层”可用。本子例选择该现有正常动作 `createStrokeFillLayer`，不扩展组件功能矩阵。沿用页面实际值：描边11、尖角限制14、Stroke白色、Fill `#d6b25e`；trim 0/100/0；taper两端长度15、宽度0、缓和30，未更改参数。

[创建前原始查询](vela-0.3.12-b1-a01-real-ae/ae06-shape-add-before.json)保护合成 id 191、仅原文字层 id 203，然后点击一次实际工具按钮。[点击后页面](vela-0.3.12-b1-a01-real-ae/ae06-shape-add-ui-after-click.json)于 UTC `06:46:22.265Z` 显示“已创建 Stroke / Fill 形状图层。”，目标为 `Group: Fill` / `selectedGroup`；[后置 Host 查询](vela-0.3.12-b1-a01-real-ae/ae06-shape-add-after.json)确认新增 ShapeLayer id 205 / `Stroke / Fill Shape`，层数1→2，原文字层保留。实际 AE 用户观察和原生 Undo 尚待确认，不提前标记完整 smoke PASS。

上述 Shape Add 前后查询复用只读快照，内层 phase 标签继承准备时字样，实际时态以各文件外层标签和时间为准；保留原始返回不改写。未截获动作自身原始回调，页面结果与独立 Host 查询分列。没有新增生产 debug seam、替换生产方法、运行 Provider 或修改生产代码。

### 裁定前实机接续汇总：Shape Add Undo

用户确认 Shape Add 的图层/Stroke/Fill 内容与一次原生 Ctrl+Z“均正常”。UTC `2026-09-09T06:50:34.790Z` 的[撤销后真实 Host 返回](vela-0.3.12-b1-a01-real-ae/ae06-shape-add-after-user-undo.json)确认只剩原文字层 id 203，已采集字段与该动作前基线完全相同。**AE-06 Shape Add 子例 PASS**。外观与 Undo 执行为用户文字确认，后置数据为真实 Host 回调，两类证据分列；未将手工确认冒充自动 trace。

下表为整个 targeted acceptance 接续结束时的最新结论，前文“尚待”记录保留当时状态，本表保留六组实际结果；当前裁定及剩余覆盖以末尾“验收裁定与剩余覆盖”为准。

| 用例 | 结果 | 实际覆盖与边界 |
| --- | --- | --- |
| AE-01 宿主与装载 | PASS | 真实 Lomond Cabinet CEP、Extensions junction、AE 26.3x87 / CEP 12.0.1；实际 parseJson 函数内容与工作区实现对应；已有 JSON.parse / defineProperty 可用 |
| AE-02 公共入口 | PASS | 已有 JSON.parse 分支；嵌套、多语言、合法转义正对照，坏 JSON、安全非 JSON 表达式及尾随无效内容负对照；错误保持传播 |
| AE-03 新旧元数据 | PASS | 工程现存新式 iconGrid 样本与构造旧式 featureStack 夹具，经真实 schema stateAction 读取并对应 UI；不泛化所有组件或认证历史来源 |
| AE-04 无效与空状态 | PASS | 7组具体注释/元数据、无图层选择、用户选中 Assets FolderItem 达成真实非 CompItem 条件；activeItem null 独立条件未覆盖 |
| AE-05 重复读取 | PASS（有限观察范围） | 新旧组件三次状态、有限字段、UI稳定及前后 Undo 菜单一致；无效/普通/空注释重复读取与有限字段稳定；未逐组观察无效输入 Undo 菜单 |
| AE-06 普通工具 smoke | PASS | Text Background Box 创建、Shape Add createStrokeFillLayer 各一次实际面板动作；用户确认结果/执行 Undo，真实 Host 确认恢复有限基线 |

[最终派生汇总](vela-0.3.12-b1-a01-real-ae/final-acceptance-summary.json)由已保存证据比对生成，不是额外 Host trace 或新离线回归。原始证据目录为 `docs/reports/vela-0.3.12-b1-a01-real-ae/`，各输入、回调、时间和用户截图路径见前文链接。

仍为 **NOT COVERED / 待裁定**：

- 无原生 JSON.parse 回退：**VM PASS / REAL EXTENDSCRIPT NOT COVERED**。本轮未全局删除或替换 JSON；需在自然缺少原生解析器的独立真实宿主中补验，或由负责人明确裁定接受当前覆盖边界，不能自行宣告完全覆盖。
- `__proto__` 特殊 setter 存在且无安全定义能力的环境：本轮未触发；明确拒绝不能描述为成功解析。
- `activeItem === null`、无工程的独立条件；本轮真实无活动合成证明来自 FolderItem。
- 无效夹具逐组原生 Undo 菜单、完整 Undo 栈、全部工程属性/同值写入与完整自动轮询 trace。已有有限快照及新旧组件菜单对照不能消除这些可观测边界。
- AE-06 动作自身原始回调未截获；已有实际 UI 消息、动作前后 Host 原始查询及用户外观/Undo确认。没有为补 trace 重复执行动作或修改生产方法。

结束时分支仍为 `fix/host-json-entry-a01-0.3.12`，HEAD 与本地 origin/dev 引用均为 `cd96e0cd65fd485a8f00ac506ee74c0f97fc5e75`，本轮未 fetch/切分支。host/index.jsx 与实施测试/fixture 的 SHA-256 均和验收开始记录一致；暂存区为空。实施轮既有改动继续保留，本验收只追加 A01 报告和证据，不改五个入口、A0/审计档案、包版本或冻结架构。

最终运行 `node scripts/report-i18n-usage.js --check`（报告最新）及 `node scripts/check-project-consistency.js`（全部通过）；没有生成内容变更。另对本报告及新增文本证据逐文件使用 `git diff --no-index --check -- NUL <file>`、解析证据 JSON，并运行 `git diff --check`；这些为文档/证据检查，不是离线生产回归。上一轮1122 focused assertions、183/183 suites继续仅作为历史离线结果，本轮没有重跑，也没有运行真实 Provider。

用户本次裁定前，targeted acceptance 停在 **IMPLEMENTED / OFFLINE PASS / REAL AE ACCEPTANCE PENDING（未覆盖条件待裁定）**。A01 未 CLOSED；未暂存、提交、推送或创建 PR，不自动进入 A11/G-02。两个 smoke 生成层已由用户撤销；用户准备的测试合成/文字与旧式夹具仍留在可丢弃工程中，本轮未保存或关闭工程。


## 验收裁定与剩余覆盖

2026-09-09，用户明确接受上述六组有界真实 AE 验收，A01 当前状态为 **TARGETED_ACCEPTED / READY FOR COMMIT / PR**。本裁定接受现有覆盖边界，不将未覆盖条件改为 PASS。**INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G**；整个 B1 和 0.3.12 均未完成，不进入 A11 或 G-02。

### 实际证据核对

本次读取并核对现有34份 JSON、报告内证据索引及4份用户 Undo 截图。六组结果沿用上表：AE-01～AE-04、AE-06 为各自指定范围 PASS，AE-05 为有限观察范围 PASS。真实 Host 返回、页面记录、派生比对和用户确认分列，未重新采集或补造回调、截图、trace。

- AE-01 保存的公共解析函数内容与实施代码对应；宿主中已有 JSON.parse 和 Object.defineProperty 为函数。该事实不证明 JSON.parse 的原生来源。
- AE-02 保存的正负结果及转义 code unit 对照与报告一致，覆盖已有 JSON.parse 分支。
- AE-03 新式样本为测试工程现存 iconGrid，未经独立历史来源认证；旧式 featureStack 为本轮构造的合法夹具。状态来自 schema 指定的 stateAction，各自刷新/移除能力按实际样本记录。
- AE-04 无选中、7组注释/元数据及真实 FolderItem 条件与记录一致。AE-05 三组重复采样及注释矩阵的既定字段比对稳定，新旧组件用户 Undo 菜单前后对应。
- AE-06 两次工具动作的用户“均正常”是外观及实际 Undo 的手工确认；两个撤销后 Host 快照均恢复各自动作前已采集字段。Shape Add 撤销后只剩原文字层 id 203，与其动作前基线一致。

现有报告内逐文件链接继续作为证据索引。早期派生汇总中的 NOT COVERED，以及 final-acceptance-summary.json 中的 PENDING，均保留采样/裁定前时态；原始 JSON 和截图保持原字节不变，以本节记录后续用户裁定，不回写历史证据。未发现影响六组有界结论的缺件或矛盾。

### 剩余覆盖与重新打开条件

| 条件 | 本次裁定与边界 |
| --- | --- |
| 无可用 JSON.parse 的回退 | 生产模块 VM PASS / REAL EXTENDSCRIPT NOT COVERED。本次 dev 合并接受该覆盖风险，0.3.12-G 重新裁定；本轮未替换或删除实际宿主 JSON。 |
| __proto__ 特殊环境 | 保留离线安全定义和失败关闭证据；特殊 setter 且无安全定义能力等真实环境未覆盖。明确拒绝不等于成功解析。 |
| 无活动合成 | 已验证实际 activeItem 为 Assets FolderItem；FolderItem 不等于 activeItem === null。null 和无工程的独立条件仍未覆盖。 |
| AE-05 读取无可见变更 | 只证明实际检查字段、指定 Undo 菜单观察和有限时间范围；不证明完整工程属性、完整 Undo 栈、无同值写入或完整轮询 trace。无效夹具逐组 Undo 仍未覆盖。 |
| AE-06 动作回调 | 两个工具动作自身未捕获的原始回调保持未知；已有页面消息、独立 Host 查询及用户确认，不将未知改为 PASS。 |

若后续出现回退解析错误、安全属性处理失效或相关回归，立即重新打开对应修复，不等待 0.3.12-G。

### 当前状态与提交关联

同步指导书 A01 当前条目、机器可读总账中的 A01，以及 AGENTS、README、HANDOFF、PROJECT_STATE、VELA_ROADMAP 的必要当前入口。总账保留原始条目 ID、原始审计证据级别和其余53项状态；本节验收不改写原始审计或 A0 历史报告。

当前分支为 fix/host-json-entry-a01-0.3.12，HEAD 与本地 origin/dev 均为 cd96e0cd65fd485a8f00ac506ee74c0f97fc5e75，仍是实施基线，**不是尚未创建的修复提交**。修复 commit / PR 关联待实际产生后记录；READY FOR COMMIT / PR 不表示已执行提交或创建 PR。

1122 focused assertions、183/183 suites（0 skip）复用本次实现轮结果，本轮没有重新执行，也不作为新增实机证据。本次仅执行文档、证据和适用的一致性检查，未修改生产或测试代码，未重跑 AE-01～AE-06 或全量回归。

### 本次文档收束检查结果

- node scripts/report-i18n-usage.js --check：PASS，生成报告最新，无生成文件改动。
- node scripts/check-project-consistency.js：PASS，全部项目一致性检查通过。
- git diff --check：PASS；另对未跟踪的本报告及34份 JSON 逐文件执行 git diff --no-index --check -- NUL <file>，均无格式错误。Git 的 LF→CRLF 提示为换行策略提示，不是空白错误；未改写原始证据来消除提示。
- 34份证据 JSON 与机器可读总账解析通过；报告索引覆盖34份 JSON 和4份 PNG，相关本地文档链接均存在，4份 PNG 的 SHA-256 与报告一致。
- 与本次编辑前 SHA-256 快照比较，38份证据、原始审计、A0 报告、生产/测试代码及冻结架构均保持原字节不变；本次仅改动本报告、五个当前入口、指导书及总账。总账另经语义比对确认其余53项完全不变。
- 当前分支/HEAD 未变，暂存区为空；未执行暂存、commit、push、PR、merge 或 tag。修复提交关联仍待实际提交后记录。
