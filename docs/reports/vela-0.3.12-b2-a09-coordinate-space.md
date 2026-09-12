# 0.3.12-B2 / A09 — Host Coordinate Space Production Reconciliation

## 当前状态摘要（2026-09-12）

**0.3.12-B2 / A09（M1、M2/F1）：TARGETED_ACCEPTED — AE26.0x67 / READY FOR COMMIT / PR。**

M1 与 M2/F1 均已在 AE26.0x67 定向接受；最新全量为 M2-F1 实施轮 **192/192 PASS（0 skip）**，实机轮及本轮文档收束未重跑。M2 七组 PASS、六次原生 Undo，**3451 个所查字段零差异**。

支持包络保持：ACK Feature 当前 **auto/center** 与既有普通2D、受支持平移父链规则；TBB Text 使用 **source-local padding**，Shape/AV visual 使用 **comp-space padding**，仍限既有静态2D/类型/父链包络。不得推导为任意 Transform、父链或 AE 版本均已支持。

AE26.3x87 跨版本复验 **DEFERRED**；AV fallback 真实 AE **NOT COVERED**，已有离线覆盖保持。INTEGRATED_ACCEPTED / CLOSED 留待 **0.3.12-G**；B2 和整个 0.3.12 未完成，不自动开始下一项。

以下各阶段记录保留发生时的事实和停止点；旧 FAIL 不改写为 PASS，当前裁定以上述摘要及文末 M2-F1 实机结果为准。

## 历史状态（2026-09-11）

**A09-M1 REAL AE REVALIDATION FAIL。** 本轮真实AE能力表已取得；正常Feature Create一次调用因 `ACK_MEASUREMENT_TO_COMP_FAILED` 拒绝，已停止后续组。AE-01能力采集PASS、AE-02 FAIL、AE-03～AE-05 NOT COVERED，见文末实机记录。实现轮108场景/548断言及唯一一次全量189/189 PASS保持历史，本轮未重跑。A09整体未TARGETED_ACCEPTED；TBB parent-space仍为 **CONFIRMED / UNFIXED**，不开始M2。

下列A0正文保留审计发生时的事实、结果与停止点；M1记录追加在同一报告末尾。A08定向验收、Detach/Remove实现及原覆盖边界保持不变。

## A09-A0 历史结论（2026-09-11）

**A09-A0 AUDITED / FIX PLAN READY。生产尚未修改。** 已用完整生产 Host 模块重新确认旧 bounds 的局部点回退，并追到真实注册 Feature 创建的几何决策和 Rect Size 写入。Text Background Box 的 parent 回退为 **CONFIRMED（源码＋生产模块/宿主替身）**，真实 AE 表现仍未验证。

本阶段只做源码复核、16个有界动态场景和43条诊断核对；核对全部符合实际预期，其中包括成功复现缺陷，不能记为产品测试通过或 A09 已实现。未运行 AE、Provider、A08 focused 或全量离线回归。未修改生产、实施测试、注册/UI、冻结架构或 metadata 0.3.6，未执行 Git 写操作。

### 1. 基线与来源

| 项目 | 本次事实 |
| --- | --- |
| 当前分支 | `fix/host-coordinate-space-a09-0.3.12` |
| HEAD / 本地 dev / origin/dev | 均为 `f5ea7a10b5633cdf972bf3bf2c7cacff6cffd14f` |
| 开始工作树 | clean；未切分支、fetch、reset 或覆盖改动 |
| 合并事实 | 当前 Git log：PR #205 合并 A08；父提交含 `.tmp` i18n 扫描边界修复 |
| A08 | 保持 TARGETED_ACCEPTED 及原覆盖边界；Detach 注册/UI未交付，Remove 宽松解码风险未解决；INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G |
| 原 A09 线索 | [原始 source audit §10](audit-baseline-0.3.11/source-audit.md)、[A0 A09](vela-0.3.12-a0-baseline-reconciliation.md)、[指导书 A09](../design/vela-0.3-reconstruction-guidance.md) |
| 原证据限制 | `HOST-COORDINATE-FALLBACK` 为局部能力夹具，原中心 `(600,350)` / `(50,25)` 不作为本次输入或结果。本次未重跑旧摘录，未沿用 A0 的旧源码行号 |

已读取当前 [AGENTS](../../AGENTS.md)、[ROADMAP](../VELA_ROADMAP.md)，完整审阅两个工具的相关 bounds、创建、刷新、状态、转换及写入路径、真实 schema 和共享 transform helper。A08 的 locator、Detach 定稿/空间补偿作为明确隔离边界，不重新展开其验收或泛化。

本次实际数值摘录及相关源码 SHA-256 保留在 [A09-A0 最小证据](vela-0.3.12-b2-a09-a0-minimal-evidence.json)。该单份 JSON 支持可机器核对的“局部 bounds 进入创建”和“错误空间进入 Position”裁定；没有保存整个世界状态。它是明确筛选的实际结果摘录，不冒充完整原始 trace。

### 2. 空间词汇与时间约定

| 词汇 | 本报告含义 |
| --- | --- |
| source/local point | `sourceRectAtTime` 的 left/top 角点或 `width/height` 素材矩形点；尚未施加图层 Transform。不能把 sourceRect 误当 Anchor 相对坐标 |
| layer space | 所属图层自身的二维/三维参考系；Anchor Point 在此空间。Shape 内部 Rect Position/Size 又属于其 shape group，本报告涉及创建的默认 group，不泛化任意嵌套 group |
| comp space | 合成参考系中的点或投影 bounds；本轮数值模型限2D。3D world/comp/camera projection 不视为同一空间 |
| parent space | 直接 parent 的 layer space；不是“从 parent Position 减去一个数”在任意变换下都成立 |
| target property space | 写入目标属性所需的空间。无 parent 的普通2D Position 可接收 comp-space 点；有 parent 的 Position 必须是 parent-space 点；Anchor 和 Rect Position 不能接收 comp-space 点 |

Adobe 的[表达式参考](https://helpx.adobe.com/after-effects/desktop/work-with-expressions/expression-language-reference/expression-language-reference.html)说明了 parented Position 的参考系及 layer-space transforms。这里只用它核对空间含义，**不据此证明 JSX 对象拥有表达式 API**。`toComp/fromComp` 出现在生产表达式字符串内和作为 Host 对象方法被调用，是两个运行环境；`sourcePointToComp/compPointToSource` 的实际类型/版本支持要在后续宿主中观测。

生产多处给 `sourceRectAtTime(t,false)` 传入 `comp.time`，但所有本报告涉及的 Host `toComp/sourcePointToComp/compPointToSource/fromComp` 调用均没有显式时间参数。Text Background Box 的定位 helper 虽接收 `t`，转换时未使用它；其 `copyTransformSnapshot` 用 `valueAtTime(t,false)`，失败后还会读 `.value`。因此“rect 在 t、变换也在同一 t”必须作为后续验收条件，不能由 helper 签名推定。动态模型固定 `comp.time=1.25`，没有模拟动画或真实宿主时间行为。

### 3. 当前真实调用图与 mutation 边界

源码位置均对应本报告基线；链接指向文件，行号仅作当前阅读定位。

```text
client/js/main.js::runDynamicToolAction (7935)
  → CSInterface / evalHost
  → host/index.jsx::runRegisteredToolAction (220)
  → 实际 registry action.hostFunction（无通用坐标验证）

ecommerceLayout.createFeatureStack → adComponentKit.createFeatureStack (1630)
  → sortTexts (1550) → legacy bounds（timeline 排序例外）
  → unionOriginalFeatureTextBounds (463)
      ├─ simple2D text → getTextVisualBounds2D（直接计算）
      └─ parented/rotated/non-simple → unionBoundsForLayers → legacy bounds
  → 每个 text 再取 legacy bounds → pillWidth / pillHeight / totalHeight
  → Undo 开始 → 新建 controller、写控制参数/Transform/metadata
  → 改 source Anchor、绑定 comment、parent、Position
  → 新建 Shape pill、写 Rect Size/Roundness/Fill 等
  → bg.parent=text，安装5类 Feature 工具表达式

ecommerceLayout.refreshSelectedComponent → (2388)
  → 验证 controller metadata → Undo 开始
  ├─ Feature: unionBoundsForLayers → legacy bounds
  │   → layoutFeatureItems → setAnchorToVisualCenter → legacy bounds
  │   → 每项 bounds / pill布局
  │   → updateRectLayer → Rect Size/Roundness/Fill + moveLayerBoundsCenterTo
  │   → source moveLayerBoundsCenterTo → translateLayerBy → Position
  │   → bg.parent=text、重绑定工具表达式
  └─ Grid: getGridRefreshLocalBounds → local布局 → Scale / Position

schema.stateAction → main.js::refreshRegistryToolState (5765)
  → adComponentKit.getState (2829附近)
  → legacy bounds → twoDLayerCount → canCreateIconGrid（只读）

ecommerceLayout.createIconGrid → validateGridLayer → strict bounds
  → 所有输入通过 → 排序/union/布局 → Undo → controller/源层写入
  → 严格bounds读回 → parent/metadata → 再读回

textBackgroundBox.create → textBackgroundBox.create (450附近)
  → Undo → 无选中: createDefaultRoundedRect
  → 有选中: createForSelectedLayer
      ├─ Text: createForTextLayer → copyTransformSnapshot
      │   → setLayerPositionAtVisualCenter → controls/shape contents
      └─ 非Text: createForVisualLayer → layerVisualBoundsInComp
          → createCenteredRoundedRect
  → parentBackgroundsToSources → 每个新bg.parent=source → 结果信封
```

注册证据：[Ad Component Kit schema](../../host/tools/adComponentKit.tool.jsx) 的 `createFeatureStack/createIconGrid/refreshSelectedComponent` 和 `stateAction`；[Text Background Box schema](../../host/tools/textBackgroundBox.tool.jsx) 的 `create`。公共派发解析实际 hostFunction 并捕获异常，[客户端](../../client/js/main.js)按 `result.ok` 显示消息并按配置刷新状态，不校验返回的空间。

**旧 helper 的所有实际消费者：** Feature 排序、非简单文本选择 union、所有 Feature 创建的 pill初始尺寸、Feature refresh 的 union/anchor补偿/布局/移动、状态 readiness。公开 `getLayerVisualBoundsInComp` 导出仍存在；仓库搜索未发现另一个运行时模块调用该导出。私有 `moveLayerVisualCenterToComp`、`fitLayerToArea` 只有定义，无当前入口调用；`createRectLayer/createCenteredPillLayer/featureDebugJson` 也只有定义。不能把这些保留 helper 写成当前用户可触发入口。

Feature 的“简单2D中心”不能保护整个创建：它只保护初始 union 中心，排序和逐项 pill尺寸仍走旧 bounds。生成后表达式使用 rect、Scale 和控制器重新求值，本次观察的静态写入及 debug 不等于最终渲染大小。

### 4. 逐转换契约核对

| 路径 / 当前源码 | inputSpace → outputSpace / API | supportedLayerTypes：实际代码条件 | time semantics | 失败与 consumer |
| --- | --- | --- | --- | --- |
| ACK旧 bounds，85–137 | source/layer四角 → 声称comp；`layer.toComp` | helper自身无明确类型/2D门禁。创建只排除非Text/3D；state有部分2D/无parent过滤；refresh依metadata | rect(t,false)，toComp未传t | 每角catch后`p=pts[i]`，局部点继续极值；允许混合成功/失败角点；所有旧消费者见上节 |
| ACK旧 rect来源 | sourceRect → source矩形；失败、null或非正尺寸后 `[0,0,width,height]` | 未区分Text/Shape/AV；未证明width/height等价可见轮廓 | rect有t，尺寸属性无t | 宽高缺失用0；无统一finite校验；width getter等未全部包catch |
| ACK simple2D，402–488 | layer rect、Anchor、Scale、Position → comp AABB（直接代数） | Text、无parent、2D、近零Rotation；Rotation读取异常被当0 | rect(t,false)，Transform `.value` | 不具备完整失败/finite保护；只服务创建前union。非简单类型转旧helper，并给warning，不拒绝 |
| ACK move/anchor，517–582 | comp bounds差量 → Position增量；Anchor写layer rect中心 | 无独立parent-space检查 | 当前comp.time + `.value` | `translateLayerBy`直接加dx/dy；旋转/缩放parent下向量空间不等价，是静态确认的缺少转换、实际影响待测；refresh已可能先写Anchor |
| Grid create，148–379 | source角点 → comp；`sourcePointToComp` | Text/Shape/AV；Create额外限制2D、无parent、非锁定、非null/adjustment/camera/light、正Scale、近零Rotation、无目标Transform表达式；AV collapse/continuous拒绝 | rect(comp.time,false)，API无显式t | 缺API/抛错`GRID_TO_COMP_FAILED`；非有限`GRID_NON_FINITE_BOUNDS`；非正`GRID_ZERO_SIZE_BOUNDS`；整组preflight拒绝后才进入写入 |
| Grid rect fallback，178–292 | AV源尺寸 → source矩形 → strict comp角点 | Text/Shape无有效rect即拒绝；AV无rect可退width/height；已有坏rect不转成“好尺寸” | 同上 | finite/positive/图层归属检查；无局部点冒充comp |
| Grid create写入，1945–2256 | comp目标中心 → 无parent Position；再建立controller parent | preflight限定输入；ctrl无parent、Anchor0、Scale100、Rotation0 | 当前状态，多次测量 | 写Scale/Anchor/Position后两次strict测量；后段异常可能已有写入。最终中心偏差>1只warning，不能概括为原子事务或完整几何验收 |
| Grid refresh，2260–2385 | 成员source rect → controller/parent空间AABB → 同空间Position | 必须parent===ctrl；成员2D/正Scale/近零Rotation等；controller自身可有非零Rotation但无parent且通过控制器检查 | rect(t,false)，成员Transform `.value` | 全部成员测量通过后layout；此处**不调用**comp转换。不能将Create的空间规则套到Refresh；numKeys没有统一预检拒绝，动画setter需另测 |
| TBB visual bounds，184–251 | layer四角 → comp；只调用`toComp` | 非Text分支进入；helper无显式2D/类型门禁；Text公共入口走另一分支 | rect(t,false)，API无t | 缺/抛API返回null；`createForVisualLayer`在addShape前抛错。缺少finite/维度检查；不能把null拒绝扩大为所有坏返回都fail closed |
| TBB visual/default，254–333 | comp中心 → 新无parent的bg Position；Anchor0；Rect在bg group | 新Shape；default无源层 | 当前t/无source default | 写入后最终bg再parent到source；这一步真实AE自动补偿尚待观察。default不依赖源坐标API |
| TBB text forward，336–363、395–417 | text rect中心(layer) → comp；优先`sourcePointToComp`，抛错再`toComp` | AE.isTextLayer，以Text Properties判定；无明确3D等拒绝 | rect(t,false)；定位helper的t未用于转换 | 两者失败则静默return，但bg已建立，Anchor已经写入；随后继续加控件/shape，仍可ok:true |
| TBB text inverse，365–391 | compPoint → bg.parent的layer space；`compPointToSource`，抛错再`fromComp` | `copyTransformSnapshot`已复制source.parent至bg，故本分支可达；无有效类型门禁 | API无t | 两者抛错则`targetPos=compPoint`；Position及可取得X/Y/Z直接写入。**CONFIRMED 错误空间回退** |
| TBB text无parent | compPoint → 无parent2D Position | 无parent；3D另行待裁定 | 同上 | 此时直接用compPoint是有条件合理路径，不应一律禁止 |
| TBB共享snapshot/最终parent | source属性→bg同名属性；`setParentWithJump(source.parent)`；最后`bg.parent=source` | [aeUtils.jsx](../../host/aeUtils.jsx):204–251；两次parent含义不同 | `valueAtTime(t,false)`，异常读`.value` | 复制Anchor/Position及分离轴、Scale/Orientation/旋转；Util.setValueSafe吞setter错误；最终reparent也吞错。不得把后一步自动补偿当作前一步输入正确的证明 |

TBB 全部 Anchor/Position 写入已落到上述三处：`createCenteredRoundedRect`、共享 `copyTransformSnapshot`、`setLayerPositionAtVisualCenter`。`buildShapeContents` 另写 **Rect Position** 为source rect中心、Rect Size为rect＋padding；它是shape group属性，不能与layer Position混同。后续控件表达式会驱动这些shape属性，不代表进行了坐标系修复。

### 5. 本次最小动态复现

复用 [A01完整Host loader](../../scripts/fixtures/host-json-entry-harness.js) 和 [A08 AE对象harness](../../scripts/fixtures/ad-component-detach-harness.js)：展开真实 `host/index.jsx` 的完整include，加载真实 `.tool.jsx` 注册、共享AE/Shape/Effects、两工具实现，再通过实际 `runRegisteredToolAction` 或 schema指定的stateAction调用。旧bounds用已有公开导出；未抽取、复制、替换生产算法，未增加export。

现有 `test-grid-host-contract.js` 和 `test-grid-refresh-idempotence.js` **确实加载整个 adComponentKit.jsx，不是旧审计摘录**，但替换了公共JSON等依赖且未走完整Host registry。前者覆盖Create门禁/严格bounds，后者覆盖本地Refresh幂等；`test-host-registry-transaction.js`抽取的是registry/loader事务段并加载真实schema，不证明坐标路径。TBB已有输入/注册测试也不能替代此次parent模型。因此本次选择更完整的A01 loader组合；只读检查这些测试，没有执行它们。

#### 5.1 旧 fallback 与实际创建消费者：CONFIRMED

共同输入：sourceRect=`[left=0,top=0,width=100,height=50]`；Position=`[500,300]`；Anchor=`[10,20]`；Scale=`[200,150]`；普通2D无parent，`t=1.25`。测试侧API模型为 `P+(point-A)*S/100`，独立算术期望 comp bounds=`[480,270,680,345]`、中心=`[580,307.5]`。

| 实际模块场景 | 实际结果 | 裁定 |
| --- | --- | --- |
| legacy-normal | bounds `[480,270,680,345]`；width/height `200/75` | 转换正向对照 |
| legacy-missing / legacy-throws | bounds `[0,0,100,50]`；中心 `[50,25]` | sourcePointToComp虽然可用，旧代码不用它；局部四角被当comp继续返回 |
| feature-create-normal | 注册创建ok:true；pillSize及实际生成Rect静态值 `[200,75]` | paddingX/Y=0，auto宽度，正常决策 |
| feature-create-missing / feature-create-throws | 同一真实注册创建ok:true；pillSize及实际Rect静态写入 `[100,50]` | 伪bounds已进入创建决策和写边界；各由1层变3层 |
| state-versus-grid | getState给`canCreateIconGrid=true`；随后的真实Create Grid因`GRID_TO_COMP_FAILED`拒绝，所观察mutation为0 | 状态仍消费旧bounds，Create则走严格API；两个入口不能相互代替证明 |

Feature三种情况下选择中心都是 `[580,307.5]`，因为这一夹具命中simple2D union。故本次证明的是**逐项初始尺寸错误**，不能杜撰该夹具controller也移到了 `[50,25]`。已安装的后续表达式没有在VM中求值；不声称最终AE像素错位。

#### 5.2 TBB parent fallback：CONFIRMED，限生产组合模型

另构造带无旋转/无缩放parent的源Text，源层在parent空间的Position仍为 `[500,300]`；parent Anchor=`[0,0]`、Position=`[100,50]`。源中心在comp为 `[680,357.5]`；bg先经真实 `copyTransformSnapshot` 取得该parent，因此此刻bg Position应写parent-space `[580,307.5]`。

| 实际生产入口场景 | 实际Position写值 / 写入时parent | 实际公开结果 |
| --- | --- | --- |
| inverse-normal | `[580,307.5]` / parent id1002 | ok:true,count1 |
| inverse-fallback-normal：首API缺失，fromComp可用 | `[580,307.5]` / id1002 | ok:true,count1；等价目标空间API对照 |
| inverse-missing / inverse-throws：两个逆API均失败 | `[680,357.5]` / id1002 | ok:true,count1；写值属于comp，目标需要parent；误差向量为 `[100,50]` |
| no-parent | `[580,307.5]` / null | ok:true,count1；本条件直接comp写Position合理 |
| forward-missing：sourcePointToComp/toComp均不可用 | 没有新的中心Position写入，最后值仍是snapshot的 `[500,300]` / id1002；Anchor已改中心 | ok:true,count1；静默跳过定位仍报创建成功 |

这是注册入口→真实共享copy→实际私有定位helper→真实setter调用的观察，不是复制一段定位算法单测。对象边界记录写入时的parent和每次值，所以不依赖最终重parent后的Position反推。原harness的parent setter只改关系，**没有模拟AE自动补偿**；后续 `bg.parent=source` 的真实视觉结果未测，也不能抵消已证明的错误空间写入。

另有3个普通AV视觉背景对照：toComp正常时ok:true/count1；缺失或抛错时ok:false/count0、未建背景（仍进入并结束公共Undo组）。sourcePointToComp可用本身不能让当前visual路径成功。本次不将后者误记为与旧ACK相同的局部点回退。

#### 5.3 证据边界与候选

- 16个场景/43条核对是本次诊断记录；继承harness、属性/Effects/Shape构造、标志、parent、setter和Undo均有替身边界。没有AE渲染、自动父级补偿、真实Property wrapper或动画求值证据。
- `.value` 与时间、parent旋转/缩放时的comp差量直接加Position、nonfinite/错误维度回值、Text/Shape无效rect落到width/height，均已定位源码风险；未动态运行的组合保持待验证，不报实机FAIL或可支持。
- TBB setter/最终parent吞错、Feature refresh写Anchor后才量测、Grid后段失败非原子，是相关失败语义约束；本轮不扩展为全工具事务重构。
- 本轮没有验证完整alpha/描边/效果渲染边界。源码名中的“visual bounds”实际是rect四角AABB；不能据名称承诺像素精确外轮廓。

### 6. 最小修复建议与待裁定支持范围

建议允许下一轮在两个工具内部修正空间契约与错误传播，保留现有公开结果信封和registry ID，**不建立通用Coordinate Framework**。先补反例成为正式生产组合回归，再改实现；本报告中的模型命令不能充当已交付测试。

1. **ACK旧bounds及所有真实消费者一起收口。** 明确区分source rect不可用、API不可用/异常、非有限/错误维度、零尺寸。只有真实转换成功的角点能组成comp bounds；禁止 `p=localPoint`、混合空间、原点/零对象伪成功。候选优先验证Host `sourcePointToComp`，是否保留另一API仅按支持类型和实际等价证据裁定，不能机械改函数名。
2. **失败先到决策门口。** Feature Create在controller/source/shape写入前取得全部必要几何；Refresh在Anchor/Shape/Position任何写入前完成该次所需测量，不能在已经改Anchor的途中发现转换失败。state几何失败不计入可用层；仅关按钮不能修复真实action。保留合法simple2D中心和现有公开返回形状；读数重排可能影响Refresh结果，须做对应回归。
3. **TBB把转换结果与所需Position空间绑定。** 先计算可用forward点；有parent则必须得到有效parent-space点，两个逆API失败明确拒绝，不能写compPoint。无parent普通2D仍可用compPoint。尽量把几何/逆转换检查移到addShape、Anchor/snapshot写入之前，避免静默return后ok:true；执行中失败应沿现有错误机制准确报告已有变更，不许承诺自动回滚。仅在此路径补必要的传播，不改全局 `Util.setValueSafe` 语义。
4. **移动和宽度不是同一个问题。** comp中心/差量写到有parent的Position必须进行点/向量转换；comp AABB尺寸也不能无条件作为带缩放parent的本地Rect Size。不要把Grid“无parent”门禁自动套到Feature/TBB、从而静默删除既有能力。尚无证据支持的旋转/缩放/3D/复杂父链要先明确有界支持或失败裁定，不能用 `[x,y]` 外形等同来放行。

**建议先行最小实施任务：** ACK旧测量失败结果＋Create/Refresh/state传播；相同阶段单列TBB forward/parent逆转换的预检和传播。接受的共同方向是“失败不产生有效几何/错误空间Position”；具体支持类型、API兼容和宽高语义仍需实施前裁定。修复顺序是测量→所有消费者拒绝→有parent目标空间→兼容/实机，不重新触碰A08 Detach。

Grid可以借鉴有限数值检查、角点全成功、类型区分的source fallback、选中输入整组预检、明确reason。不能借鉴为通用能力承诺：Create的无parent/近零rotation/正Scale是自己的支持条件；Refresh计算parent空间；控制器/成员写入后仍可能失败；最终中心只是warning；动态、3D和任意parent并未由这些实现统一解决。

### 7. 后续离线与真实AE有限矩阵（本轮未执行）

离线应沿完整Host loader、真实registry动作/state，保留正向几何和非法输入。故障只注入AE对象替身，覆盖转换缺失/抛错/返回null、短数组、NaN/Infinity、部分角点失败；坏rect/零尺寸及AV尺寸fallback；所有真实消费者的失败写入边界；parent逆转换成功/双失败/无parent；混合选择及执行中setter错误。断言comp/parent空间分别独立算术比较，不能只用生产helper自己往返。补两个以上层的排序/union和Feature Refresh，既有Grid/普通创建兼容；实施时再按授权运行focused与最终一次全量。

后续真实AE先正常装载、确认版本/target/文件和实际入口；只在用户确认的可丢弃工程进行必要创建。先用只读API探测建立支持表，再安排真实注册Create/Refresh与原生Undo。**不得在正常Host全局覆盖API制造缺失/抛错/非有限结果**；这些留作离线故障注入，实机只记录自然出现的失败。

| 代表行 | 类型与空间条件 | 时间/数据条件 | 目的 / 入口 |
| --- | --- | --- | --- |
| M1 | Text、Shape、普通AV footage、precomp各一层；2D、无parent、非零Anchor/Position | t=0，静态 | 只读记录 sourceRect/width/height、API存在性及实际返回；Text创建Feature/TBB、其余TBB/Grid仅在各自支持范围内 |
| M2 | Text及Shape/AV代表；无parent、Scale `[150,75]`，非零Anchor | 静态t=0 | 四角、中心、Rect Size和Position空间；区分source尺寸与comp AABB |
| M3 | Text/AV代表；translation-only parent含非零Anchor | t=0 | source→comp→parent反转换、复制parent与最终reparent；Grid Create应按自身契约拒绝 |
| M4 | Text及Shape代表；parent非100%Scale/Rotation；另设层自身Rotation | 静态 | 点与差量区别、parent局部Size；API可转换不等于工具布局支持；先裁定后写入，不套A08平移模型 |
| M5 | 正常2DText/Shape，无parent及平移parent代表 | t=0与非零t；Position/Scale属性动画或Feature控制器动画各一代表 | rect与转换是否同一t；`.value`/`valueAtTime`来源；不得通过改变用户时间补造“原t”结果 |
| M6 | Text/AV/precomp的3D代表及相机条件 | 固定t | 只读区分world、comp投影和target Position；在支持未确认前拒绝写入，不把z丢弃视作成功 |
| M7 | 空Text、空Shape、源尺寸/rect无效代表；precomp collapse状态另列 | 静态 | 源几何支持及zero-size，Text/Shape不能把素材整幅宽高当可见内容；不存在的自然故障保持NOT COVERED |
| M8 | API缺失/抛错/非有限、不可写/表达式/关键帧冲突 | 离线故障样本；实机只读记录可达条件 | 明确拒绝、无错误空间写入、执行中失败准确回报；不为矩阵污染工程或替换生产方法 |

无需做笛卡尔积，也不宣称所有AE版本存在或缺少任一方法。实际验收的数值容差、可见边界口径和创建/Refresh/Undo对照须事先固定；API返回、独立派生空间结果、UI画面和用户Undo各自标来源。A08的已接受普通2D/平移父链当前帧定稿不扩展为这些条件已经通过。

### 8. H0证据与本轮检查

长期提交面仅本报告和一份最小JSON；完整原始诊断保留在本地临时证据工作区，不属于版本控制交付：`.tmp/vela-evidence/0.3.12/a09/a0/`。`git check-ignore -v`确认由已有 `.gitignore:26:*.tmp` 覆盖，无ignore规则变更。

本地保留 `reproduce.js`、`records.json`、`reproduce-01.log`、最小摘录生成命令、检查脚本/日志和完整SHA inventory；不将其复制到新的大型tracked目录。原A08证据、历史失败/验收结论与i18n生成报告保持原字节。

| 本轮检查 | 实际结果 |
| --- | --- |
| `node .tmp/vela-evidence/0.3.12/a09/a0/reproduce.js` | 16场景、43条诊断核对符合预期；一次运行，原输出保留。没有把复现缺陷记作修复PASS |
| `node scripts/report-i18n-usage.js --check` | PASS；未重新生成/手工编辑报告 |
| `node scripts/check-project-consistency.js` | 288项PASS |
| 本地 `check-documents.js` | 最小JSON及本地诊断JSON可解析；12个Markdown本地链接存在；摘要计数与原始records哈希对应 |
| 新增文件格式 | 两份交付逐字节UTF-8解码、无BOM、无行尾空白/冲突标记、文件末尾换行；单独检查新增文件，不借tracked diff冒充 |
| `git diff --check` | PASS；原有tracked文件无差异 |
| 完整性 | 开始时590个受版本控制文件逐份SHA-256对照，0变化，涵盖生产/实施测试/冻结架构/包版本/既有报告证据；HEAD未变 |

本轮提交面（尚未暂存）：**1份主报告＋1份最小证据JSON**；最小证据JSON **12,826 bytes**。主报告 27163 bytes；两份交付合计 39989 bytes（均仍为untracked新增文件，未暂存）。本地raw/命令/校验工作区 **9份文件、208,060 bytes**；均被ignore，不进入Git diff。统计不包含其他阶段本地证据，也没有移动或覆盖它们。

停止于 **A09-A0 AUDITED / FIX PLAN READY**。A09未IMPLEMENTED / TARGETED_ACCEPTED / CLOSED，A08原定向验收不变；不继续实施，不进入0.3.12-C1。

## A09-M1 Strict Measurement Propagation

### M1.1 范围、基线与追加裁定

沿用 `fix/host-coordinate-space-a09-0.3.12`；HEAD、本地dev、origin/dev仍为 `f5ea7a10b5633cdf972bf3bf2c7cacff6cffd14f`。开始时已有上文A0主报告与最小JSON，均未暂存。生产只修改 [adComponentKit.jsx](../../host/tools/adComponentKit.jsx)，未改TBB、公共JSON、registry/schema、客户端、冻结架构或包metadata。

用户原要求是完整测量成功后才能进入任何相关写入。复核发现旧Refresh先改Anchor，再测source；改Rect后又测background中心。任意parent、用户表达式或改造Shape下，旧bounds不能直接充当变更后的bounds。因此在实现前请求具体支持边界裁定，用户明确回复：**“允许有界 Refresh plan，明确记录新增限制”。** 当前采用普通2D、平移父链、可预先确定中心的工具矩形计划；其他无法可靠预测的组合在预检拒绝。此限制只属于Feature Refresh，不套到Grid/Create或A08 Detach。

### M1.2 修复前正式生产反例

新增正式 [coordinate measurement suite](../../scripts/test-ad-component-coordinate-measurement.js)，沿完整Host loader加载仓库生产模块，经真实 `ecommerceLayout` registry action与schema state入口调用。没有复制bounds实现或新增生产debug export。before运行发生在生产修改前，完整记录和基线源码保存在本地 `.tmp/vela-evidence/0.3.12/a09/m1/`，未覆盖A0证据。

before共92场景、172次断言尝试；10场景满足当时的新契约断言，82场景未满足。这个计数包含测量顺序要求、错误传播等不同断言，**不是82个独立漏洞，也不是原产品10 PASS/82 FAIL的验收结论**。之后新增Refresh边界与兼容场景，最终108场景不可直接与原92场景总数相减。

| 实际生产观察 | 修复前事实 |
| --- | --- |
| 正常公共bounds | source rect `[0,0,100,50]`；Position `[500,300]`、Anchor `[10,20]`、Scale `[200,150]`。独立2D算术期望及实际结果均为comp AABB `[480,270,680,345]`，宽200、高75、中心`[580,307.5]` |
| `measurement-missing` | 删除替身的 `toComp` 后，公共函数仍返回local AABB `[0,0,100,50]`、中心`[50,25]`；输入层变换仍非零 |
| `create-missing` | 两层选择中第二层API缺失，真实注册Create仍`ok:true`；simple2D union中心`[580,232.5]`看似正确，但坏层pill为`[100,50]`而非`[200,75]`，已进入生成几何；记录39个边界mutation事件 |
| Create故障组 | 21种故障中10种返回`ok:true`且发生mutation，包括API缺失/抛错/throw null、字符串分量、第三角失败、rect字符串宽/零尺寸/负尺寸及折叠点。其余没有据此笼统称为伪成功 |
| Refresh故障组 | 21种故障中19种返回`ok:true`且发生mutation；每例观察27或30个边界事件。例如 `refresh-rectThrows` 仍返回`Component refreshed (2 item(s)).`并有27个事件 |
| 正常Create/Refresh | 原本也返回成功；before未满足的是“写入前完成全部测量”断言，不能将正常几何结果改记为既有错位 |
| state | 使用正常`ok:true`状态信封；失败层原先可能计入text或geometry。应修正readiness计数，不把状态信封本身改成无效 |

21种故障含missing/throws/throw null、null/undefined/短数组/NaN/Infinity/字符串坐标、仅第三角失败、sourceRect读取异常/缺失/null/非有限/类型错/零宽高/负宽、所有点重合及最终bounds溢出。故障均来自Node AE边界替身，未在真实AE制造异常。

### M1.3 严格测量与source geometry契约

内部链为 `readMeasurementRect → measureLayerVisualBoundsInComp → checkedMeasurementBounds`；公开 `getLayerVisualBoundsInComp(layer,time)` 成功仍返回原八字段bounds，失败现在抛出可识别的 `ACK_MEASUREMENT_*` Error。原来依赖“失败也返回对象”的外部调用方需处理异常；仓库内真实消费者均已核对，保留公开但伪造comp空间的旧函数不再存在。

| 来源/转换 | 当前规则 |
| --- | --- |
| 有效 `sourceRectAtTime(time,false)` | 复制left/top/width/height，要求有限number、宽高大于0、端点加法有限；四角使用同一份rect |
| rect调用抛错或字段读取异常 | 明确拒绝，不改用width/height |
| rect缺失、null或undefined | 仅 `ADBE AV Layer` 且有实际source、不是nullLayer时，保留明确矩形素材的width/height候选fallback；尺寸仍须严格校验 |
| Text/Shape无有效rect | 拒绝，不把layer.width/height当可见源内容 |
| 已有rect非有限、类型错、零/负尺寸 | 拒绝；AV也不能用尺寸fallback掩盖已有坏rect |
| source/local四角→comp | 保持旧成功API `layer.toComp(point)`；不增加 `sourcePointToComp` 优先级。缺失/抛错（包括throw null）为 `ACK_MEASUREMENT_TO_COMP_FAILED` |
| 转换返回值 | 至少两个分量，所需x/y必须为有限number。null、短值、字符串数字、NaN/Infinity均拒绝；一个角失败即整份测量失败 |
| 输出AABB | left/top/right/bottom/width/height/centerX/centerY全部有限，宽高大于0；不再使用固定极值哨兵、local回退或零bounds伪成功 |

这仍是有效source rect四角的comp AABB，不包含alpha像素、描边/效果外轮廓的额外保证。`time`用于sourceRect，`toComp`调用约定保持原样，不增加未核实的时间参数；生产动作使用实际 `comp.time` 且不改变时间。真实Host方法可用性、当前时间求值及版本差异留待实机。

### M1.4 消费者传播及写入顺序

| 入口 | 新顺序与失败边界 |
| --- | --- |
| Feature Create | `measuredFeatureTexts`先取得全部文本的完整测量，缓存排序、union及每项pill所需数据。任一必需层失败整体拒绝，不拿剩余层继续。simple2D fast path继续产生既有中心，但使用缓存rect且无法绕过逐层strict转换。全部pill尺寸/总高度检查完成后才进入Undo、创建controller、写source/生成Shape |
| Create Anchor | `centerTextAnchor`使用同一预检rect；不再在第一批写入后重新读取sourceRect。失败动作保留`ok:false/message`信封，零相关mutation、零Undo begin |
| Feature Refresh | `planFeatureRefresh`先测所有source/background、形成union，核对支持条件并算好Anchor、Position、Rect Size、Roundness、Fill目标；完整计划成功才开始Undo。`applyFeatureRefresh`只消费计划，先source、再background，最后沿既有parent/模板绑定过程收束；不在变更后再调用rect/toComp补测 |
| Refresh执行异常 | 实际setter失败仍可能部分完成；返回`ok:false`并说明 `changes may be partial; no rollback performed`，结束Undo。预检不是事务回滚，不把Undo存在等同于原子恢复 |
| state/readiness | 失败geometry不计入textLayerCount/twoDLayerCount；混合选择只计有效层。全坏选择两个Create readiness均false，读取不写工程；真实action仍独立预检 |
| Grid | 独立strict helper、Create/Refresh及reason保持原实现。state仍使用公共旧测量入口而不是Grid strict API，因此是保守readiness，不声称两个API支持面完全相同；实际Grid动作保护未被状态计数替代 |

公开动作ID、参数/JSON信封不变。旧私有 `layoutFeatureItems` 的写入后重测流程被计划执行替代。`setAnchorToVisualCenter`、move/fit/updateRect等原私有辅助仍保留，当前Feature Refresh不再调用；其中调用公开bounds的地方也会收到严格失败。未改A08 Detach/finalize/locator或Remove。

### M1.5 有界Refresh新增限制与空间解释

源Position需要parent space，不能把comp中心直接赋入。计划先保存严格comp bounds及原parent平移量，再计算本次目标parent空间；background另外记录自身相对Position的中心偏移，按计划中的源Anchor/Position确定变更后的parent偏移。只有已知线性平移条件及尺寸变化不改变中心的矩形，才可不重新测量而得到这些目标。source Position存在已准入工具表达式时，它的当前求值仍是parent偏移来源；最终仍走原模板重新绑定，不改为Detach静态定稿。

本轮明确新增的预检拒绝包括：

- 非普通2D/锁定/未知layer类型；AV启用collapse或连续栅格化。Text/Shape固有collapse标志不单独拒绝，未改其标志。
- 父链非单位Scale、非零Rotation，或Scale/Rotation/Anchor表达式；未知parent Position表达式；循环父链或source依赖同次要编辑的source。并非Grid的无parent限制：已覆盖非零Position/Anchor的外部平移ancestor。
- 待写Anchor/Position/Rect Size/Roundness/Fill不是静态可写属性（包括已有关键帧），或Position维度分离；读取失败沿预检异常返回，不伪装默认安全值。
- source/background未知表达式、有求值错误或模板不完全匹配。保留签名时必须属于当前artifact；无签名的精确旧模板可兼容。当前source引用列表必须与完整模板匹配，旧引用经过用户改造/重排而无法准确确认时也可能拒绝，不声称全部历史Refresh工程均继续支持。
- 不完整source/background配对；background并非单个已知Rect＋Fill组、有额外Shape组、Rect中心不是零或sourceRect不能证明中心固定。用户改造Shape不通过任意缓存bounds猜测支持。

没有恢复历史parent、扫描清理用户表达式、烘焙动画或通用坐标框架。成功对照保留原Refresh结果：两项普通场景Anchor归中为`[0,0]`，parent-space Position分别`[-2.5,-62.5]`、`[-2.5,55.5]`，Rect Size均`[148,104]`；同一宿主模型中加载归档基线生产模块与当前模块的最终数据一致。新增外部parent Position`[70,30]`、Anchor`[5,7]`对照仍得到相同相对Position，外部注释/关系/数据未改。以上是独立简单2D算术及实际模块对照，不是AE渲染证明。

### M1.6 最终离线验证及替身边界

完整生产Host/registry harness仍负责真实模块加载。原 [Detach harness](../../scripts/fixtures/ad-component-detach-harness.js) 没有 `toComp`，正常Feature准备因此曾依赖旧fallback；本轮仅给其普通层factory增加显式2D仿射 `toComp` 能力模型，原 `sourcePointToComp` 未改。新suite另外独立计算Position/Anchor/Scale/Rotation及parent递归的预期，故障明确注入边界API；不复制生产bounds/preflight实现。

| 本轮实际命令 | 最终结果 |
| --- | --- |
| `node scripts/test-ad-component-coordinate-measurement.js` | 108场景，548 assertions PASS；108 matched /0 failed |
| `node scripts/test-grid-host-contract.js` | 120 assertions PASS |
| `node scripts/test-grid-refresh-idempotence.js` | 106 assertions PASS |
| `node scripts/test-host-registry-transaction.js` | 27 assertions PASS；此既有suite含源码段隔离，完整工具组合证据来自新suite |
| `node scripts/test-ad-component-detach.js` | 251 assertions PASS，本轮相关回归实际重跑 |
| `node scripts/test-ad-component-detach-finalize.js` | 1134 assertions PASS，本轮相关回归实际重跑 |
| `node scripts/test-ad-component-detach-locator.js` | 932 assertions PASS，本轮相关回归实际重跑 |
| `node scripts/run-all-tests.js` | 最终生产/测试状态仅运行一次：189 discovered /189 executed /189 PASS /0 FAIL /0 skip |
| `node scripts/report-i18n-usage.js --check` | PASS；无需生成或手工改报告 |
| `node scripts/check-project-consistency.js` | 288项PASS |
| `node --check` 两个变更测试JS；实际JSX正文经stdin `node --check` | PASS；生产新增内容保持var/function等ES3语法，Node语法检查不等于ExtendScript实机执行 |

完整日志、before/after records与计数、mutation事件、基线源码、兼容比较及检查脚本均在 `.tmp/vela-evidence/0.3.12/a09/m1/`。`focused-final.log` 是最终548项原输出；`full-offline.log`保留唯一全量原输出。开发中失败日志仍本地保留：有界plan初次拒绝旧Scale场景、补充parent表达式检查，以及测试侧直接JSON编码循环AE对象导致的断言采集错误均未覆写；最后一项改为引用关系断言后通过，未将其记为产品失败。

新suite覆盖全部21种故障的测量/Create/state/Refresh，坏层位于两层选择中以排除“剩余层继续”伪成功。失败动作还要求明确 `ACK_MEASUREMENT_`，防止测试因其他更早/更晚门禁拒绝而误认测量已受保护。正常Create/Refresh事件顺序要求全部 `sourceRectAtTime/toComp` 读取在Undo开始前；执行中故障另有部分失败对照。新增合法AV尺寸fallback、坏rect不可替换、Text/Shape边界、external平移parent与Grid API不能替代legacy API等对照。

替身的 `.value` 为明确提供的属性值；没有执行真实AE表达式、渲染像素、模拟原生parent自动补偿或完成真实Undo。A08已有synthetic evaluator/wrapper模型边界不变。事件计数只证明所监测setter/层操作，不声称真实AE内部写入次数；离线成功不替代普通工具实机Create/Refresh画面及Undo。

### M1.7 待真实AE矩阵与M2边界

后续仅在另行授权的可丢弃工程正常重启装载后执行；不得在正常Host覆盖API/函数制造故障。先取得实际ACK公开函数与装载来源，再只读记录真实类型、sourceRect、toComp存在性/原返回及实际comp.time，按当前接口观察判断支持，不能拿版本号替代能力证据。

| 有限代表条件 | 后续必需观察 |
| --- | --- |
| 两个普通2D Text，非零Anchor/Position，t=0 | 实际注册Feature Create；逐层四角、排序、union、pill尺寸；写入前后独立读数及用户画面/Undo |
| Text的非100% Scale/Rotation，及一组translation parent | 严格测量实际comp AABB；Create仍按原支持语义，Refresh只在新增有界plan支持时执行。非平移父链必须预检拒绝、所查字段不变，不擅自扩展空间补偿 |
| 正常生成Feature，工具模板完整，普通平移链 | 实际注册Refresh；source/background预检数据、parent-space Position、Rect尺寸与结果信封；用户画面和原生Undo单独确认 |
| 相同受支持Feature，非零comp.time/控制器参数动画代表 | 确认sourceRect、属性.value与toComp对应实际当前时间；先只读取数，再按实际支持决定Refresh，不把离线静态模型冒充动画验证 |
| Shape、AV footage、precomp只读各代表；空Text/空Shape | rect与AV尺寸fallback的实际可用性；state不计失败geometry；自然缺失/错误API明确拒绝。3D/collapse/zero-size只记录现行边界，不强行制造成功 |
| Grid正常/strict失败最小smoke | 保持独立sourcePointToComp路径和reason；区分state保守判断与真实动作的自身预检 |

每组先固定同一空间、时间和比较方法；Host API返回、独立派生几何、用户画面及Undo分别标来源。API缺失/抛错/非有限返回仍主要为离线故障覆盖，不要求逐例向真实工程注入故障。

**TBB parent-space问题维持 CONFIRMED / UNFIXED。** `setLayerPositionAtVisualCenter` 的parent逆转换失败后直接写compPoint及forward静默跳过问题未修改，留待另行裁定M2。A08 current-frame finalize/stable locator、已接受的真实验收及Remove宽松解码风险均保持原边界；本轮没有A08实机重验或新acceptance。

### M1.8 H0留存、完整性与停止点

继续只保留同一个A09主报告与原A0最小JSON；本轮未新建M1长期summary，因为报告已足以核对有限关键结论。正式suite及小范围harness变更属于测试代码，不作为原始证据归档。完整原始证据保存在本地ignored临时工作区，不属于版本控制交付；没有新建大型tracked证据目录。

最终留存统计与检查见下表；“tracked evidence”指拟进入Git的证据提交面，当前两份文件仍未暂存，不能冒充已经提交。

| 项目 | 结果 |
| --- | --- |
| tracked evidence files / bytes | 2份；合计 57,939 bytes（本报告＋原A0最小JSON 12,826 bytes） |
| M1 local raw files / bytes | 31份；4,597,839 bytes（仅M1，含完整日志/records/基线副本/本地检查） |
| 本阶段工作树范围 | 一个生产JSX、一个既有harness、新增一个正式suite；A09主报告追加及保留A0最小JSON，无其他生产/测试/注册/UI修改 |
| 历史与保护检查 | 590个基线tracked文件核对，仅授权的ACK与harness变化；Grid strict/Create/Refresh及A08 Detach私有/公开函数原文一致；TBB、公共JSON、冻结架构、包版本、既有历史证据保持原字节。A0历史正文与本轮开始时副本一致 |
| JSON/链接/格式 | 7份JSON解析、15个报告本地链接存在性均PASS；UTF-8/无BOM/末尾换行/冲突标记/行尾空白检查通过；新增suite和两份untracked文档单独覆盖；`git diff --check`通过 |
| Git及实机 | HEAD未变、index为空；未暂存/commit/push/PR/merge/tag，未操作AE或Provider |

停止于 **A09-M1 IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。A09整体未TARGETED_ACCEPTED/CLOSED，TBB未修，不开始M2或0.3.12-C1。

## A09-M1 Targeted Real AE Revalidation（2026-09-11）

### AE.R1 本轮结果与停止原因

**A09-M1 REAL AE REVALIDATION FAIL。** 正常新建2D Text具备非零有效sourceRect，但本次AE 26.3x87的真实图层对象没有可调用的 `layer.toComp`。实际注册Create一次调用返回如下原始JSON；独立B0/B1共138个叶字段严格相等，层数2→2，未产生controller/generated层。测量预检已经阻断伪bounds，却同时阻断本轮必需的正常创建旅程，因此不能接受M1为TARGETED_ACCEPTED。

```json
{"ok":false,"message":"Create feature stack preflight failed; no changes made: Error: ACK_MEASUREMENT_TO_COMP_FAILED"}
```

本次停止后未重试、未切换API、未修改生产或测试、未执行Refresh/Grid/Provider/TBB。没有要求用户Undo：失败后的所查工程字段无变化，此时Undo可能撤销夹具准备。**没有取得或宣称原生Undo成功，也没有将本次正常Create失败改记为安全拒绝PASS。**

| 分组 | 结果 | 实际覆盖 |
| --- | --- | --- |
| 环境/装载 | PASS | 正常重启确认、当前target重新发现、映射/文件SHA、3个公开入口全文比对、Host load无错误 |
| AE-01 只读Host能力表 | PASS | 四种正常类型＋空Text/空Shape，共6层；每个真实source/local点`[7,11]`的toComp调用均记录函数未定义异常。这里PASS仅指能力事实采集，不是转换成功 |
| AE-02 正常Feature Create | FAIL | 两个普通2D Text、有效rect、非零Anchor/Position、Scale及有限Rotation；真实registry调用一次，明确预检拒绝；未取得comp AABB、pill/画面/Undo成功证据 |
| AE-03 Refresh supported envelope | NOT COVERED | AE-02失败后停止，未创建Refresh资产或调用动作 |
| AE-04 Refresh fail-closed | NOT COVERED | 未执行；不能以Create的测量拒绝替代本组非平移parent边界 |
| AE-05 invalid geometry / Grid smoke | NOT COVERED | 空Text/Shape的rect只在AE-01读过，没有执行本组state/无效Create/Grid动作及Undo |

五组计数为 **1 PASS /1 FAIL /3 NOT COVERED**，环境检查另计。唯一真实工具动作是 `ecommerceLayout.createFeatureStack` 一次。可机器核对的最小长期记录为 [M1 real AE summary](vela-0.3.12-b2-a09-m1-real-ae-summary.json)，其中保留实际错误raw、环境、能力事实、比较计数与原始文件SHA。

### AE.R2 环境与证据来源

用户先确认“已重启，A09测试工程就绪”，随后明确允许建立独立A09测试资产。`.debug`实际配置AEFT端口8088；确认后重新请求该调试入口的target列表，唯一Lomond Cabinet面板target为 `2D30511D831D0D5B790B8742D1F02EAE`，URL对应Extensions下 `com.kevin.aetoolbox/client/index.html`。真实通道是该CEP target上的 `CSInterface.evalScript`；Node只负责CDP传输和证据保存，没有用VM代替Host。

AE返回版本 **26.3x87**，真实CEP userAgent为AdobeCEP **12.0.1** / Chrome99。项目为 `D:\Projects\Vela Test\Vela Test.aep`；初始活动合成仍是历史 `A01_TOOL_SMOKE`（id191，time0）。仅只读观察旧层，没有对A08资产执行Create/Refresh/Detach/选择变更或属性写入；后续操作在新合成进行。

Extensions仍为当前工作树junction，工作树及映射路径的ACK文件SHA-256同为 `090f9403fd2b9cc4f515c58384fd726569198e79a302f88d07a47d40af651bcb`。`getLayerVisualBoundsInComp`、`createFeatureStack`、`refreshSelectedComponent` 的实际完整函数文本与工作树一致；比对仅归一CRLF→LF及外侧空白，未删注释、改token或只查关键字。Host load error count为0、有效registry为true、7个注册工具。

私有strict measurement/plan helper没有新增export、没有全文独立提取。正常装载来源、文件一致、公开入口比对及此次真实 `ACK_MEASUREMENT_TO_COMP_FAILED` 行为共同构成有限装载证据；不宣称单靠公开toString证明全部私有实现。

### AE.R3 样本准备与只读能力表

独立准备Undo组为 `A09 M1 Prepare Independent Fixtures`，与被测工具动作分开。新增5秒/30fps/960×540的 `A09_M1_CAPABILITIES`（id237）、`A09_M1_CREATE`（id269），另有160×90子合成 `A09_M1_PRECOMP_SOURCE`（id249）。普通AV样本为真实PNG footage（item264，388×62）；图片是已有历史PNG的只读本地副本，仅充当素材类型输入，**不是本轮截图或视觉证据**，原文件未修改。没有延长旧合成、覆盖保存或清理历史资产。

| 样本 | 实际matchName / 来源 | sourceRect结果 | `typeof toComp` / 调用 |
| --- | --- | --- | --- |
| 非空Text | `ADBE Text Layer` | 非零有限rect，宽约154.447876、高约37.216125 | undefined / `ReferenceError: 函数 layer.toComp 未定义` |
| Shape矩形 | `ADBE Vector Layer` | left=-50、top=-30、100×60 | 同上 |
| PNG footage | `ADBE AV Layer` / FootageItem | 0,0,388,62 | 同上 |
| precomp | `ADBE AV Layer` / CompItem249 | 0,0,160,90 | 同上 |
| 空Text | `ADBE Text Layer` | 0,0,0,0 | 同上 |
| 空Shape | `ADBE Vector Layer` | 0,0,0,0 | 同上 |

各层2D/parent、Anchor/Position/Scale/Rotation、width/height可读性及完整精度均在本地raw中保留，表内近似数不是几何断言依据。六层均未改写toComp/sourcePointToComp、全局JSON、类型或原型。自然API缺失是本次宿主事实，不推广为“所有AE版本均缺失”。这里没有测试另一转换API，也不据旧Grid实现推断该API本轮已可用。

### AE.R4 正常Create的失败与独立后置检查

C1-B0是两个真实Text层，parent=null、2D且没有用户表达式/关键帧，当前time0；Create源码没有有限Rotation的前置禁止，故按本轮要求使用有限旋转代表。

| 层 | id | Anchor / Position | Scale / Rotation | sourceRect宽高 |
| --- | --- | --- | --- | --- |
| A09_CREATE_TEXT_A | 281 | `[12,18,0]` / `[300,170,0]` | `[140,90,100]` /0° | 约252.261001×38.878875 |
| A09_CREATE_TEXT_B | 282 | `[23,9,0]` / `[620,355,0]` | `[100,100,100]` /8° | 约220.595626×33.138000 |

B0保存各自sourceRect、四个local角及每次实际toComp结果，共8次调用均为函数未定义。**独立comp AABB为UNAVAILABLE**；没有用Position/Scale公式、生产bounds返回值或local点填补缺失结果。当前2D Text的Transform数组实际有3个分量，这只保留为宿主读数；Refresh未执行，未据此宣告第二个实机故障。

B0同时直接读取schema所指的 `getState`：selectionCount=2，但textLayerCount/twoDLayerCount均0，canCreateFeatureStack=false。现行schema的Create按钮要求该state为true，因此本次采用用户已授权的真实registry路径检查action自身保护；没有强行启用按钮，没有声称UI端到端通过。

被测调用为 `AEToolbox.runRegisteredToolAction("ecommerceLayout","createFeatureStack",paramsJson)`；实际参数为gap14、paddingX24、paddingY12、cornerRadius28、pillWidthMode=auto、textAlign=center、sortMode=yPosition、fillColor=`#D6B25E`。调用前再次核对项目、comp269、time0、唯一两层选择、身份/name/comment/parent及Transform，保护检查未阻断；**action自身返回的JSON直接作为原始evalScript回调保存**，没有外包手工成功信封。

比较口径在动作前固定：几何绝对误差1e-4、颜色每通道1e-6、Undo数值1e-6，文本/身份严格。由于没有成功生成几何，几何/颜色/Undo容差未用于宣告PASS。实际后置读数C1-B1与B0逐叶严格比较：138字段、0差异；两层id仍为282/281，层数2、time0，原comment、Transform、表达式状态与原文均保持。此证据只证明所查字段没有变化；没有真实Host写入计数或原生Undo队列计数。装载的公开Create源码在测量catch返回后才有Undo begin，和此次拒绝位置相符。

### AE.R5 归因、后续裁定与留存

已确认的最早阻碍是 **实际Host对象API不可调用**：有效sourceRect建立之后，source/local→comp的旧API入口不存在。strict检查按本次实现契约明确拒绝，阻止了local伪bounds；但当前真实AE的正常Feature创建能力未满足验收要求。不能将此改写成已接受的支持范围缩减，不能切回旧local fallback，也不把失败归给TBB。

下一步须先裁定ACK在当前宿主可用、空间/时间语义已验证的转换适配，再决定最小修复；本轮不实施API切换、Refresh补丁或M2。后续如果修复仍需正常Create/Refresh及剩余组复验，现有空内容观察不能替代AE-05动作。原离线548 assertions及唯一189/189 suites继续属于实施轮，不被本次实机失败抹去，也未在本轮重跑。

完整raw、实际Host/CEP命令、B0/B1、能力表、文件hash和比较脚本保存在 `.tmp/vela-evidence/0.3.12/a09/m1-real-ae/`（ignored），不进入Git提交面。没有强制制造截图；本轮没有成功后的用户画面确认。工程中只留下明确授权的A09准备资产，未自动保存/关闭/Undo。

| 留存/检查项 | 本次结果 |
| --- | --- |
| 本轮证据提交面 | 主报告更新＋一个小型实机summary；A09整体保留3份证据文件（含原A0最小JSON），合计 75,265 bytes |
| 本轮本地raw | 40份 / 647,771 bytes；包括命令、基线inventory、只读快照、真实回调、派生比较和校验 |
| 保护范围 | 633份开始时文件核对；仅允许主报告追加变化，生产/实施测试、A0/M1离线原始文件及既有历史证据不变 |
| 检查 | 16份JSON解析、16个Markdown本地链接、新增文件UTF-8/格式及`git diff --check`通过；i18n freshness、288项project consistency通过；未跑产品测试 |
| Git | 当前分支与HEAD保持，index为空；未暂存/commit/push/PR/merge/tag |

停止于 **A09-M1 REAL AE REVALIDATION FAIL**。A09整体未TARGETED_ACCEPTED，TBB仍CONFIRMED / UNFIXED，A08验收结论不变；等待下一步裁定，不进入M2/C1。

## A09-M1a — Real Host Source→Comp Capability Probe（2026-09-12）

**SOURCE_POINT_TO_COMP_VERIFIED，限本工作站真实 AE 26.0x67 的下述样本。** 停止于 **A09-M1a HOST CAPABILITY PROBED / ADAPTER DECISION READY**。Text正常、8°旋转、translation-only parent及两个当前时刻的独立2D数值比较均通过；Shape、PNG footage、precomp静态代表也通过。**本机不是昨日的26.3x87；26.3x87本轮NOT COVERED，先前A09-M1 REAL AE REVALIDATION FAIL不变。** 此结果是转换能力与空间语义证据，不是Feature产品验收，也不自动允许所有类型或版本。

本轮只追加本节与一份 [M1a小型summary](vela-0.3.12-b2-a09-m1a-host-capability-summary.json)。未实施adapter，未改生产/测试，未重跑离线，未调用Feature Create/Refresh、Grid或TBB，未Undo昨日失败动作，未进入M2，未执行Git写操作。A09整体未TARGETED_ACCEPTED；TBB保持 **CONFIRMED / UNFIXED**；A08及历史M1离线、实机记录保持原边界。

### M1a.1 工作站、授权与真实通道

- 分支 `fix/host-coordinate-space-a09-0.3.12`；HEAD、本地origin同名引用与只读 `git ls-remote` 返回均为 `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`，开始工作树clean。未fetch、切分支或修改Git配置/index。实际工作目录是本机Premi的Extensions目录，未沿用旧机器junction假设、未复制工作树。
- 本机没有旧工程路径，也没有昨日A09资产。用户追加授权“你直接新建一个工程吧，现在的机子没有那个测试工程”。因此在当前未保存临时工程中建立本轮独立 `A09_M1A_HOST_CAPABILITY`（comp13，960×540、4秒、30fps）和160×90子合成30；未重建昨日Create失败样本或旧机器`.tmp`。开始准备时已有空“合成 1”（id1，0层），最终仍为0层，未对其写入。
- 首次只读环境经Adobe文档支持的 [AfterFX -r](https://helpx.adobe.com/ca/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html) 返回26.0x67。随后两次CLI夹具准备均被AE“已有其他脚本正在运行；第二个脚本未运行”提示拒绝，没有取得执行回调；拒绝提示与命令保留，后续inventory确认没有A09资产。未使用提示中的覆盖标记。用户打开面板后恢复CEP通道。
- 全部转换探针和实际夹具准备经本机唯一Lomond Cabinet target `398F8DC76E93976FE94B7D2CD1D1BBC2` 的 `CSInterface.evalScript`，URL为当前工作树 `client/index.html`。Node只传输、保存原始回调、独立算术比较；未用VM、生产helper或Grid helper作为真值。每次按当前comp/layer重新取得Host引用；脚本为局部IIFE，没有缓存旧wrapper、替换方法、改类型/原型或写全局JSON。
- 准备与读取使用不同命令、回调和本地文件。父链只建立在新建的可丢弃Text44/null47上；动画只写入新Text48。PNG为本地生成64×32静态素材（135 bytes），不是截图或视觉证据。工程最终未保存、未关闭，comp13保留8层，当前time恢复0。

### M1a.2 首个Text门槛与采集精度

先建立非空Text25，Anchor `[12,18,0]`、Position `[300,170,0]`、Scale `[140,90,100]`、Rotation0、无parent、2D。真实 `typeof sourcePointToComp` 为`function`；四角及中心各调用3次，无异常，均返回2维有限number且重复稳定，满足继续采集的门槛。

首轮采集器对负数直接调用 `toPrecision(17)` 时暴露本机ExtendScript格式化异常：例如真实 `-297.820006094873` 被写成`-298`，`-0.4000078253448`被写成`-0`。同一回调内保留的原生 `toSource()` 字符串仍包含实际小数。额外只读数值格式化诊断确认后，**只修改`.tmp`证据编码器**为独立符号＋正数精度格式化，重新取得真实layer并重采；未改样本、生产或测试。原`text-first`回调与诊断完整保留，原轮错误数字字段不参与数值裁定。精度修正后的`text-first-precise`、`types-read`及后续parent/time读取构成有效证据。

原始返回数组保存为`returned`，同时保存其原生`rawToSource`、维数、元素类型、finite状态和异常；没有坐标回退、裁剪、归一化或手工`ok:true`值。能力检查与格式化诊断不会被算作产品Action成功。

### M1a.3 逐类型能力及独立空间比较

每个代表均读取 `sourceRectAtTime(comp.time,false)`、Anchor/Position/Scale/Rotation的value及valueAtTime、parent、2D/3D和comp.time；完整精度在本地raw。以下主支持表全部位于time0、普通2D、无parent、无Transform表达式/关键帧、Position未分离。

| 真实类型 / layer id | matchName | sourcePointToComp | toComp | compPointToSource | fromComp |
| --- | --- | --- | --- | --- | --- |
| 非空Text 0° /25 | ADBE Text Layer | function | undefined | function | undefined |
| 非空Text 8° /26 | ADBE Text Layer | function | undefined | function | undefined |
| Shape矩形 /27 | ADBE Vector Layer | function | undefined | function | undefined |
| PNG footage /29，FootageItem28 | ADBE AV Layer | function | undefined | function | undefined |
| precomp /43，CompItem30 | ADBE AV Layer | function | undefined | function | undefined |

仅对`sourcePointToComp`实施转换调用；其他三列都是`typeof`，尤其两个逆API没有调用、没有TBB验收。每个sourceRect取左上、右上、右下、左下、中心，原local坐标直接传给真实方法，每点3次。

独立预期只使用Host实际读数：令`q=(localPoint-Anchor)*Scale/100`，再计算 `[q.x*cos(r)-q.y*sin(r)+Position.x, q.x*sin(r)+q.y*cos(r)+Position.y]`，`r=Rotation*pi/180`。固定逐轴绝对误差容差 **1e-4 AE unit**；未根据结果放宽。比较脚本未导入生产或测试夹具，未用API返回构造期望。

| 无parent样本 | Anchor XY / Position XY | Scale XY / Rotation | 五点×3次最大逐轴绝对误差 |
| --- | --- | --- | --- |
| Text 0° | `[12,18]` / `[300,170]` | `[140,90]` /0° | `3.2520294098503655e-5`，PASS |
| Text 8° | `[23,9]` / `[620,355]` | `[100,100]` /8° | `2.7081068537881947e-5`，PASS |
| Shape | `[11,7]` / `[280,260]` | `[110,85]` /0° | `1.2207031033995008e-5`，PASS |
| PNG | `[9,6]` / `[410,210]` | `[120,95]` /0° | `1.2207031033995008e-5`，PASS |
| precomp | `[18,13]` / `[570,330]` | `[90,110]` /0° | `1.2207031033995008e-5`，PASS |

此表的sourceRect依次为非空Text、非空Text、`[-50,-30,100,60]`、`[0,0,64,32]`、`[0,0,160,90]`；两Text完整小数及所有角点见raw。本次类型之间未发现空间差异，未为了统一结果修改夹具；只支持表中真实代表，未泛化任意Shape内容、AV来源、3D、特殊栅格化、表达式或动画。

### M1a.4 translation-only parent

Text44初始Anchor `[17,11,0]`、Position `[350,230,0]`、Scale `[125,80,100]`、Rotation0；无parent的五点×3次比较PASS。独立null47为2D、无parent，Anchor0、Position `[90,60,0]`、Scale100、Rotation0。

先采无parent结果，再单独执行获授权的`child.parent=parent`准备操作。AE自动将child Position读回为 `[260,170,0]`；Anchor/Scale/Rotation保持。没有重写child Position以迎合期望。随后重新取得两个Host对象，用child实际读数计算local→parent space，再加parent实际平移 `[90,60]` 得到comp预期；五点×3次PASS，最大误差 `1.2598931562024518e-5`。建立parent前后均与各自独立期望匹配。未测parent rotation/scale补偿、多级父链或parent＋动画组合，不扩大M1 Refresh支持范围。

### M1a.5 当前comp.time

单独Text48使用Anchor `[19,7,0]`、Scale `[115,85,100]`、Rotation0、无parent；Position仅两个线性关键帧，t0=0为 `[210,140,0]`，t1=1为 `[470,310,0]`。关键帧准备与时间采集分开记录。固定同一个local中心 `[-0.64000031352043,-22.3360014557838]`，分别切换comp.time后重新取得Text，读取Position.valueAtTime并调用无显式time参数的真实sourcePointToComp。

| comp.time | 独立comp预期 XY | 实际返回 XY（每次3次完全稳定） | 最大绝对误差 |
| --- | --- | --- | --- |
| 0 | `[187.4139996394515,115.06439876258376]` | `[187.414001464844,115.064399719238]` | `1.8253925020417228e-6`，PASS |
| 1 | `[447.4139996394515,285.0643987625838]` | `[447.414001464844,285.064392089844]` | `6.67273980070604e-6`，PASS |

两个时刻的不同返回均与当时变换吻合，验证此Text样本使用当前comp.time。`finally`恢复原time0，独立最终snapshot确认仍为0；关键帧只留在本轮可丢弃Text48。未测试中间时刻、其他类型动画、表达式或parent＋time组合。

### M1a.6 裁定与留存

主支持表合计9个比较记录、37组local点、111次真实方法调用：无调用异常，返回均为2维有限number，每组三次严格重复稳定，全部独立误差≤1e-4。整体最大误差 `3.2520294098503655e-5`。主表不重复计入早期两个各15次的Text门槛采集；首轮错误精度字段按前述规则排除。

本工作站分类 **A / SOURCE_POINT_TO_COMP_VERIFIED**，支持下一步裁定M1b最小adapter；本轮没有实施。26.3x87能力仍待该版本真实复核，不能用26.0x67结果把昨日M1失败或AE-03～AE-05未覆盖改为PASS，也不能据逆API存在把TBB标为已验证。

完整raw、实际发送的Host/CEP脚本、准备命令、数值比较、采集精度诊断和临时夹具信息全部保存在 `.tmp/vela-evidence/0.3.12/a09/m1a-host-capability/`（ignored）。旧机器raw未重建。受版本控制的证据仅本报告追加与上述小型summary；字节数与最终只读文件核对见下表。

<!-- A09-M1a retention -->

| 留存 / 最终核对 | 结果 |
| --- | --- |
| 本轮受版本控制的变更面 | 既有报告追加＋1份summary；两文件完整大小合计 75,757 bytes，其中summary 9,278 bytes |
| 本轮新增证据内容 | 报告增量＋新summary合计 20,282 bytes；原报告历史字节保持 |
| A09长期证据合计 | 既有A0/M1记录与本轮summary，共4份 / 96,690 bytes |
| 本轮本地证据 | 129份 / 692,830 bytes，全部位于上述ignored目录；含raw、采集/准备脚本、比较、诊断和完整工作树基线hash |
| 文件范围 | 初始594份tracked文件hash核对，593份不变，仅本报告追加；另新增1份summary。生产/测试未变，历史报告前缀原字节保留 |
| 数据完整性 | 主表37组点/111次原生返回与序列化数值一致；6份带前后值的只读采集相同；5个静态代表的最终snapshot相同；JSON解析与git diff --check通过 |
| Git与离线 | HEAD/分支保持，index为空；没有Git写操作，没有运行离线测试、i18n或project consistency脚本 |

**停止：A09-M1a HOST CAPABILITY PROBED / ADAPTER DECISION READY（AE 26.0x67限定）。** 未实施adapter；M1失败、26.3x87未复核及TBB CONFIRMED / UNFIXED均保留。

## A09-M1b SourcePointToComp Host Adapter

2026-09-12：**A09-M1b IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。本轮在既有分支实施ACK私有source/local→comp adapter与严格时间一致性检查，纠正正式harness中的Host API形态；最终专项201场景/993断言通过，唯一一次全量实际189 discovered /189 executed /189 PASS /0 FAIL /0 skip。**没有执行真实AE产品动作。** A09整体仍未TARGETED_ACCEPTED，TBB仍 **CONFIRMED / UNFIXED**，M2未开始。

### M1b.1 基线与实机事实关联

沿用 `fix/host-coordinate-space-a09-0.3.12`，HEAD为 `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`。本轮开始工作树包含上一轮M1a报告追加与尚未暂存的新summary，已识别并完整保留；未要求清空、暂存或重建分支。本轮额外改动仅生产 `host/tools/adComponentKit.jsx`、正式 `scripts/fixtures/ad-component-detach-harness.js`、正式 `scripts/test-ad-component-coordinate-measurement.js`及本报告追加。没有新的M1b tracked evidence JSON。

旧机器 **AE26.3x87 / 旧M1实现：REAL AE REVALIDATION FAIL** 保持历史原文。旧M1选择了真实Text/Shape/AV/precomp对象上不可调用的`toComp`，正常Feature Create一次返回`ACK_MEASUREMENT_TO_COMP_FAILED`；所查B0/B1 138字段0差异，AE-03～AE-05未覆盖。该接口选择错误不是“当时环境问题”，不会被本轮离线PASS重写。

M1a在另一台 **AE26.0x67** 上直接验证 `sourcePointToComp`：Text0°/8°、Shape、PNG、precomp、平移parent及两个当前comp.time代表，37组点/111次真实调用均有限稳定，最大逐轴误差`3.2520294098503655e-5 < 1e-4`。这一有界事实支持当前adapter决策；M1a summary与全部历史内容保持。**26.3x87的sourcePointToComp仍NOT COVERED**，须返回该机器另做最小能力/产品复验。本轮没有新的AE、CEP、Undo或视觉验收事实。

### M1b.2 正式转换与时间契约

ACK strict measurement通过私有 `convertMeasurementSourcePointToComp(layer,point,time)` 转换sourceRect四角，唯一正式Host入口为 `layer.sourcePointToComp([x,y])`。方法接收原source/local点；全部四角成功才返回完整comp AABB。公开 `getLayerVisualBoundsInComp` 的成功数据形状保持，测量失败继续throw，由现有Create/Refresh/state消费者处理；没有新注册入口或共享坐标框架。

不保留`toComp` fallback：它正是旧实机失败中不可用的Host入口，保留它会再次允许替身的虚构能力掩盖真实缺失。即使fixture人为提供可调用toComp，adapter也不读取或调用它；sourcePointToComp不可用仍拒绝。不使用fromComp、compPointToSource、表达式字符串、数学转换或local点回退。原Feature工具表达式中的表达式语言`toComp/fromComp`文本保持原样，不是Host adapter调用。

| 条件 | 正式测量结果 |
| --- | --- |
| sourcePointToComp缺失、非function、getter不可读、调用抛错（含无reason抛出值） | `ACK_MEASUREMENT_TO_COMP_FAILED` |
| null/undefined、长度<2、长度不可读/不有限、x/y不可读或非number、NaN/±Infinity | `ACK_MEASUREMENT_INVALID_COMP_POINT`；没有坏值修复 |
| 任一角失败，包括第三角失败 | 整份measurement失败，后续角点不继续；没有部分bounds |
| 有限返回但bounds为零或溢出 | 保留既有`ZERO_SIZE_BOUNDS` / `NON_FINITE_BOUNDS` strict拒绝 |
| requested measurement time非finite number | `ACK_MEASUREMENT_INVALID_TIME`，读取sourceRect前拒绝 |
| layer.containingComp或其time不可可靠读取、缺失或非finite number | `ACK_MEASUREMENT_TIME_UNAVAILABLE` |
| requested time与当前containingComp.time绝对差大于`1e-9`秒 | `ACK_MEASUREMENT_TIME_MISMATCH` |

`requireMeasurementCurrentTime`使用固定、逐次读取的绝对数值epsilon **1e-9秒**，边界含等号。它仅容忍时间浮点表示差异，与frameDuration无关，也不使用M1a的`1e-4`几何容差。检查发生在sourceRect读取前及每次角点调用前，避免读取rect后或四角之间时间变化而返回混合几何。fixture验证了正/负epsilon边界、略超边界、非当前时间及不可读/nonfinite时间。

measurement不修改comp.time、不seek后恢复、不把requested time替换成当前time，也不使用valueAtTime构造数学替代。rect仍按传入time读取，Host转换按已经核对的当前时间执行。现有Create/Refresh/state继续传comp.time，正常路径专项通过；公开helper显式请求非当前time现在明确失败。此同步检查不宣称任意动画、表达式或并发Host状态具备新的支持承诺。

### M1b.3 支持边界与写入顺序

Create保留原有合法rotation/scale路径，使用真实Host入口测量；正常Text、8°、非100% Scale及平移parent的AABB由测试侧独立预期核对。Shape/AV/precomp只在各自现有measurement/state条件下验证，Feature类型过滤保持。

Refresh有界plan、平移父链门禁、3D/未知表达式/关键帧/额外Shape组拒绝及setter部分失败处理均未改。所有measurement故障仍在首个geometry write、Undo开始前拒绝，源/生成层快照保持；未扩展旋转/缩放parent Refresh、collapsed precomp、任意Shape、任意动画或A08 Detach空间能力。M1a的translation-parent通过不解除任何这些门禁。

代码区段对照确认从 `gridFiniteNumber` 起的全部原生产文本保持，涵盖Grid自己的 `convertGridSourcePointToCompStrict`、Grid Refresh以及后续ACK消费者、Detach实现；Grid未复用ACK adapter或其新增时间门禁。TBB文件、schema/UI、Vela冻结边界、metadata及既有i18n报告没有变化。

### M1b.4 Harness纠正与故障来源

正式共享factory默认现在是 `sourcePointToComp=function`、`toComp=undefined`。原sourcePointToComp的2D模型补入Rotation与parent affine递归，原本为M1准备成功而虚构的toComp实现移除。模型覆盖Anchor/Scale/Rotation/Position及平移parent；它仍是明确的AE对象替身，不是表达式引擎、渲染器、真实parent自动补偿或原生Undo模拟。

专项仪表只包裹factory提供的sourcePointToComp以记录实际调用事件，不再另造toComp。正常几何期望采用独立“rect中心变换＋投影半宽/半高”AABB公式和手算常数；fixture按逐角affine实现。期望不调用生产adapter、Grid helper或fixture转换API。旋转Create还直接核对实际Rect Size写入，而不是仅看已有两位小数的响应诊断值。

原M1的 **21类fault × measurement/Create/state/Refresh四消费者＝84场景** 保持case id与故障语义，转换fault全部移到sourcePointToComp，rect fault保持原处；21类清单及原测试源码在本地before副本保留。新增6类转换边界fault×4＝24场景。原24个其他场景继续保留，其中旧 `legacy-does-not-substitute-grid-api` 按本轮正式契约迁移为 `host-source-api-without-toComp`，不再要求ACK拒绝已验证的Host入口。再加69个adapter/time/consumer边界场景，最终 **201场景**。

在修改生产前，用纠正后的harness和当时197场景取得M1b专属before：61 matched /136 failed，执行422条断言；不少失败发生在旧生产无法准备正常Feature的阶段，不能把61 matched当成产品合格。旧机器或旧M1原始before没有删除、覆写或重建。

首轮adapter专项197场景为195 matched /2 failed，生产实现此后未再改。两例为新增测试判断问题：把已有响应诊断的两位小数当成完整几何值、以及误以为foreign containingComp可越过Grid既有所有者门禁。测试改为核对实际Rect写入与原Grid拒绝，另补4个正/负epsilon边界，最终201/993全部通过；开发轮原始records和日志保留。它们不改写先前真实AE FAIL。

### M1b.5 最终离线验证

先执行coordinate专项，再完成相关回归；确认生成报告fresh后冻结生产/测试hash，运行唯一一次全量。全量结束后只有文档和本地证据工作，冻结hash核对不变；未因输出计数或时间限制重跑全量。

| 最终命令 | 实际结果 |
| --- | --- |
| `node scripts/test-ad-component-coordinate-measurement.js` | 201场景 /993 assertions；201 matched /0 failed |
| `node scripts/test-grid-host-contract.js` | 120 assertions PASS |
| `node scripts/test-grid-refresh-idempotence.js` | 106 assertions PASS |
| `node scripts/test-host-registry-transaction.js` | 27 assertions PASS |
| `node scripts/test-ad-component-detach.js` | 251 assertions PASS |
| `node scripts/test-ad-component-detach-finalize.js` | 1134 assertions PASS |
| `node scripts/test-ad-component-detach-locator.js` | 932 assertions PASS |
| `node scripts/test-host-json-entry.js` | 1122 assertions PASS |
| `node scripts/test-tool-catalog.js` | 61 assertions PASS |
| `node scripts/test-registry-number-support.js` | PASS（原suite不输出断言计数） |
| `node scripts/run-all-tests.js` | **唯一一次：189 discovered /189 executed /189 PASS /0 FAIL /0 skip**；全量内coordinate同为201/993 |
| `node scripts/report-i18n-usage.js --check` | PASS；无需生成更新 |
| `node scripts/check-project-consistency.js` | PASS |
| 两份变更JS的 `node --check`，JSX正文经stdin `node --check` | PASS；新增生产语法为ES3兼容var/function，不冒充真实ExtendScript运行 |
| JSON、报告本地链接、历史前缀/范围hash、`git diff --check` | PASS；最终证据统计见下表 |

Create/Refresh零mutation结论限专项仪表监测的Anchor/Rect/Position等setter、parent/comment/expression、层创建/删除/排序和comp.time setter；不是AE内部写入次数。27类转换/rect故障与9类时间读取/失配故障均跨四消费者检查，另保留有界Refresh正常/拒绝/执行部分失败对照。离线没有执行真实AE产品Action、Provider或qualification。

### M1b.6 证据与停止点

遵守H0：逐例records、fault/before/after、完整full stdout/stderr与汇总、代码原稿、命令、最终冻结hash和文件inventory仅存 `.tmp/vela-evidence/0.3.12/a09/m1b/`。主报告中的契约、故障迁移、数值预期与实际命令计数足以核对本轮结果，不新增M1b tracked evidence JSON；M1a summary保持原字节。

**停止：A09-M1b IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING。** 后续真实产品复验须另行授权；26.3x87 sourcePointToComp仍NOT COVERED。A09整体未TARGETED_ACCEPTED，TBB仍CONFIRMED / UNFIXED，M2未开始。没有暂存、commit、push、PR、merge或tag。

<!-- A09-M1b retention -->

| 最终证据 / 文件核对 | 结果 |
| --- | --- |
| 本轮tracked证据变更 | 仅主报告追加 11,661 bytes；完整主报告 78,140 bytes；没有M1b tracked JSON |
| 当前Git已跟踪A09证据 | 3份 / 99,073 bytes |
| 保留的M1a summary | 1份 / 9,278 bytes，仍未暂存且原字节保持；长期A09证据面合计4份 / 108,351 bytes |
| M1b本地完整证据 | 50份 / 9,792,560 bytes，仅上述ignored目录；不纳入Git |
| 最终边界检查 | 开始595份文件（含M1a summary），591份不变，仅授权4份变化；原报告66,479 bytes前缀保持；84个旧fault消费者case id完整保留 |
| 验证 | 288项project consistency、17个报告本地链接、JSON解析、diff whitespace检查通过；80个有观测事件的失败Action/边界案例无相关mutation或Undo开始 |
| 冻结与Git | 最终生产/测试hash与唯一全量运行一致；HEAD/分支未变，index为空；无暂存或其他Git写操作 |


## A09-M1b targeted real AE revalidation — AE 26.0x67

2026-09-12：**A09-M1 REAL AE REVALIDATION FAIL — AE 26.0x67**。R1正常Feature Create通过真实registry仅执行一次，返回`ok:true`，但表达式求值后的pill尺寸与独立comp AABB＋padding不符；用户随后提供的现场截图显示相同包裹异常。按失败纪律停在R1 B1，**R2、R3、R4均NOT COVERED，原生Undo/B2未执行**。没有重试Create、执行Refresh/Grid或现场修复。

M1b实现仍为 **IMPLEMENTED / OFFLINE PASS**，上一轮201 scenarios /993 assertions与唯一一次189/189全量PASS保持历史事实，本轮未重跑。26.3x87仍 **REVALIDATION PENDING**；此前该版本旧M1失败不变。本轮不授予A09-M1或A09 TARGETED_ACCEPTED。TBB继续 **CONFIRMED / UNFIXED**，M2未开始。小型结论见 [AE 26.0实机summary](vela-0.3.12-b2-a09-m1b-real-ae-26.0-summary.json)。

### M1b-R.1 正常重启与实际装载

沿用`fix/host-coordinate-space-a09-0.3.12`，HEAD `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`。开始时保留M1a/M1b既有dirty工作树：主报告、ACK生产、两份正式测试文件及未暂存M1a summary；不把它描述为clean。开始595份文件hash记录与报告78,140 bytes原稿保存在本地。本轮只增加本节与一份小型实机summary，生产/测试不再修改。

用户回复“已重启，面板就绪”。AE从旧PID19468变为PID47404，启动时间2026-09-12 14:02:21（本地）；从`.debug`的AEFT 8088重新发现CEP target `4CB201785328B15D83AB3F69ACBDBA6D`，标题Lomond Cabinet，URL指向当前Extensions工作树的`client/index.html`。所有Host命令经该真实CEP的`CSInterface.evalScript`执行，没有手动evalFile重载生产、替换函数、注入Host API或复用旧layer wrapper。

| 装载检查 | 实际结果 |
| --- | --- |
| AE app.version / buildNumber | `26.0x67` /67 |
| Host读取ACK文件与工作树二进制SHA-256 | 均为`0c7ed0fa5c22d91f4d5d29b479cf01bb0995bca81455a955cb34c7112e539638`，144,367 bytes完全相同 |
| 实际公开函数 | getLayerVisualBoundsInComp、createFeatureStack、refreshSelectedComponent的Host `toString()`与工作树对应完整函数匹配；仅规范化CRLF/LF及外层空白，不删除注释或函数体 |
| Host registry装载 | loadErrors=[]，hasValidRegisteredToolCatalog=true，lastAttemptSucceeded=true |
| 私有adapter装载依据 | 正常重启＋相同扩展路径/完整文件字节＋实际公开函数匹配；未暴露或替换私有闭包，随后真实Create也越过旧API失败 |

采集工具事件与产品结果分开保留：第一次UTF-8文件读取规范化了换行，不能直接用于二进制SHA；逐字节转hex的只读脚本超过45秒回调等待，未取得callback，未重发，期间未执行任何产品动作。AE恢复响应后改用直接BINARY字节字符串读取，快速完成精确SHA校验。超时命令、时间和两种读取证据均留在.tmp；该采集故障没有被算作产品PASS或R1失败原因。

最小能力smoke仅普通Text25的一个合法左上点：`sourcePointToComp=function`、`toComp=undefined`，实际返回`[186.223999023438,142.951995849609]`，2维有限number，无异常。没有重跑M1a 111次探针。

### M1b-R.2 R1准备、B0与唯一Create

单独准备Undo组创建可丢弃合成`A09_M1B_R1_CREATE_26_0`（id13，960×540，5秒，30fps），不改动原“合成1”。comp.time固定0.5秒；Text A=id25、Text B=id26，普通2D，无parent、关键帧或用户表达式。字体大小40，内容分别为“Feature Alpha”与“Feature Beta”；保留Host实际字体读数，不因结果修改夹具。

| R1源层 | Anchor XY | Position XY | Scale XY | Rotation | sourceRect width×height |
| --- | --- | --- | --- | --- | --- |
| Text A | [12,18] | [200,185] | [140,90] | 0° | 302.439988404512×29.2800021916628 |
| Text B | [23,9] | [550,355] | [100,100] | 8° | 267.679993897676×29.2800021916628 |

B0保存comp/time、id/层顺序/parent/comment、完整所读属性树、Transform值及pre-expression值、表达式/错误/关键帧、sourceRect和四角local/真实sourcePointToComp返回。另以Host Anchor/Position/Scale/Rotation独立计算`local−Anchor → Scale → Rotation → Position`，对四角取min/max；不调用生产bounds、Grid或正式harness。八点逐轴最大偏差`3.023147633030021e-5`，小于预先固定`1e-4 AE unit`。

唯一被测调用为`AEToolbox.runRegisteredToolAction("ecommerceLayout","createFeatureStack",paramsJson)`。明确参数：gap14、paddingX24、paddingY12、cornerRadius28、auto宽、fixedWidth320、fillColor#D6B25E、gradient关闭、center对齐、yPosition排序。原始callback直接保存，返回`ok:true`、itemCount2、componentId=featureStack_001、artifactId=ack_20260912_141347_297729；没有ACK_MEASUREMENT错误。返回中原有“Used comp-space bounds fallback…”诊断文字原样保留，它不代表新增Host toComp fallback。

B1实际共有5层：controller29、源Text25/26、背景30/31，相关metadata与parent实际存在。两个source Position及背景Position/Rect Size/Roundness/Fill共五类10条工具表达式均启用、expressionError为空。所采B1数值中未发现NaN/Infinity，属性读取无异常。B0 requested measurement time=comp.time=0.5，B1仍0.5；没有seek，也没有故意请求旧time。

### M1b-R.3 R1失败：存储尺寸正确，表达式求值后的实际几何错误

独立期望为B0源Text comp AABB尺寸加`[2×24,2×12]`。表中数值仅为便于阅读四舍五入至6位；裁定使用raw完整精度与固定1e-4容差，没有按callback中两位小数判断。

| 源层 | 独立期望pill尺寸 | 实际存储Rect Size（pre-expression） | 实际表达式Rect Size | 背景实际comp AABB尺寸 |
| --- | --- | --- | --- | --- |
| Text A，140/90%，0° | 471.415984×50.352002 | 471.415955×50.352005，PASS | 336.725703×55.946669，FAIL | 336.725708×55.946686，FAIL |
| Text B，100%，8° | 317.149939×90.248906 | 317.149963×90.248901，PASS | 315.679994×53.280002，FAIL | 315.679962×53.279999，FAIL |

存储Rect Size的最大绝对误差仅`2.917647361755371e-5`。但Text A实际Rect宽差`−134.69028107609057`，Text B实际Rect高差`−36.968903847135024`。背景sourceRect四角另经真实sourcePointToComp转换后形成comp AABB，仍证实尺寸偏差，因此不是仅把不同空间的Rect值直接相比造成的假失败。

用户随后提供现场截图：Alpha文字横向超出背景两端，旋转Beta未被背景完整包裹；与数值失败一致。截图原文件复制并hash留在.tmp，没有进行图像编辑；没有取得“画面正常”确认，也没有把截图当作精确数值来源。

有界原因分析（推断，非修复验收）：初始Host测量和Rect写入吻合独立预期，随后现有Rect表达式基于sourceRect/Scale再次计算尺寸并除以Text Scale，没有投影旋转四角。B1显示AE建立parent关系后，A背景Scale已为`[71.4285714285714,111.111111111111]`，B背景Rotation已为−8°；前者再除Scale造成重复尺寸补偿，后者按未旋转rect得到不足的高度。现有source Position表达式同样按local高度×Scale布局。本轮不修改这些表达式或parent策略，不把离线写入值PASS扩大为表达式求值/画面PASS；正式harness并非真实表达式引擎或AE parent自动补偿模型。

### M1b-R.4 停止边界与证据

**停止：A09-M1 REAL AE REVALIDATION FAIL — AE 26.0x67（R1几何/画面）。** 已保存B0/B1；失败现场保留，没有原生Undo、没有B2恢复结论。R2 supported Refresh、R3 fail-closed boundary、R4空Text state/Create与Grid smoke均未执行，不能推断通过或失败。也没有重试Feature、放宽容差、继续M2、调用逆API修TBB或Undo历史失败动作。

完整命令、展开Host/CEP脚本、raw callbacks、B0/B1、独立逐点计算、用户重启回复/现场截图、采集故障说明及hash inventory仅在`.tmp/vela-evidence/0.3.12/a09/m1b-real-ae-26.0/`。Git长期证据只追加本报告与一个小型实机summary；完整采集保持ignored。收尾只做JSON解析、Markdown本地链接/格式、git diff --check、i18n freshness及project consistency；不运行离线专项或189 suites，不执行Git写操作。

<!-- A09-M1b real 26.0 retention -->

| 最终证据 / 范围核对 | 结果 |
| --- | --- |
| 本轮长期证据增量 | 主报告追加 9,528 bytes＋新实机summary 4,456 bytes，合计 13,984 bytes |
| 当前Git已跟踪A09证据 | 3份 / 108,601 bytes；其中完整主报告 87,668 bytes |
| 两份尚未暂存summary | M1a 9,278 bytes（原字节保持）＋本轮实机 4,456 bytes；长期A09证据面总计5份 / 122,335 bytes |
| 本轮local完整证据 | 95份 / 4,081,135 bytes，全部位于上述ignored目录；含用户原图、脚本/callback/B0/B1/独立比较/命令/hash inventory与收尾核对 |
| 工作树范围 | 开始595份中594份字节未变，仅主报告追加；原78,140 bytes历史前缀保留；另新增实机summary；生产/测试/TBB本轮未修改 |
| 收尾检查 | JSON解析、18个Markdown本地链接、格式/git diff --check、i18n freshness、288项project consistency PASS；离线suite本轮运行0次 |
| Git与停止 | HEAD/分支与本地origin跟踪ref保持一致，index为空；没有fetch、暂存、commit/push/PR/merge/tag；R1 FAIL后没有产品动作或Undo |


## A09-M1c-D0 Feature Dynamic Geometry Expression Reconciliation

2026-09-12，当前工作站 **AE 26.0x67**。**A09-M1c-D0 DIAGNOSED / EXPRESSION FIX PLAN READY**，限定为本节验证的A类局部候选及其明确包络。当前生产表达式的错误已用实际B1值完整重现；保留background.parent=Text的scratch候选通过两种指定Scale/Rotation、文本变化及translation-only外部parent。**这不是产品Action验收或生产修复完成。** 原R1失败保持，R2–R4未执行；26.3x87仍待复验，TBB仍CONFIRMED / UNFIXED，M2未开始。

### M1c-D0.1 保护现场与源码来源

沿用`fix/host-coordinate-space-a09-0.3.12`、HEAD `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`，理解并保留M1a/M1b既有dirty工作树。本轮开始冻结596份文件，ACK实际工作树SHA-256仍为`0c7ed0fa5c22d91f4d5d29b479cf01bb0995bca81455a955cb34c7112e539638`。AE仍为本次M1b正常重启后的PID47404；每个Host命令经.debug 8088重新发现当前CEP target，重新取得真实comp/layer对象。

R1合成id13没有Undo、Create重试、表达式替换、Transform或parent修改。开始/结束两次完整只读snapshot相同，开始snapshot也与上一轮M1b B1相同；15,089个采集叶字段0差异（包含专门Transform字段及属性树中的重复读数，不宣称覆盖AE全部内部状态）。source/background/controller id仍为25/26、30/31、29。

两组实际source Anchor/Position/Scale/Rotation、parent/sourceRect/source Position全文；背景Anchor/Position/Scale/Rotation、parent、Rect Position、pre-expression Rect Size、Rect Size全文与实际value、背景sourceRect及真实sourcePointToComp四角；controller全部相关effect值，都在本轮raw snapshot中保存。未从旧JS wrapper取得这些值。

从当前dirty源码直接截取两个唯一字符串构造器：`featureTextPositionExpression(refs,itemIndex)`（1172行）和`featurePillExpressions()`（1270行）。后者唯一返回background Position、Rect Size、Roundness、Fill Color四个body；1243/1342行分别安装它们。Node只执行这两个纯字符串构造器以验证来源，不以任何生产geometry helper计算真值。剥离实际表达式的7行签名头后，10条实际body与当前builder生成文本逐字匹配；全文和builder源码仅留.tmp。Git只读历史`ea34945`中的这两个builder与当前相同，说明该公式早于M1b adapter；没有从报告推断复制表达式。

### M1c-D0.2 表达式输入与输出空间

| expression | inputs | input space | output property | required output space | parent assumptions | scale assumptions | rotation assumptions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| source Position | 自身/兄弟sourceRect、Scale、refs、Gap/Padding/宽度/对齐参数 | rect为source local；乘Scale后的长度被当作视觉布局单位 | Text Transform Position | immediate parent即controller local | parent=controller；controller及祖先应只平移；Anchor等于当前rect中心才无需offset | abs(Text Scale)，再直接当controller单位；未处理controller缩放 | 高宽不投影Z Rotation，等效假定0° |
| background Position | parent Text、Text.parent controller、Text.position.y、ctrl.toComp、txt.fromComp | [0,Text.position.y]为controller local，再经comp | background Transform Position | immediate parent即Text local | bg→Text→controller；bg Anchor0；目标点被假定为行/文本中心 | fromComp反解实际Text变换，不手工除Scale | 点的逆变换能处理rotation；目标点仍不检查当前rect中心和旋转后高宽 |
| Rect Size | sourceRect、abs(Text Scale)、Padding、Fixed Width、Width Mode | source local→乘Scale后的长度→加padding | Pill / Rectangle Path Size | Rect自身单位，之后再经group、background和祖先变换 | bg→Text→controller；Pill group为identity | 除的是source Scale；不读background Scale或实际净变换，相当于预期bg local Scale100%并继承Text Scale | 不投影旋转四角、不检查world orientation |
| Roundness | controller Corner Radius | 参数标量 | Rectangle Path Roundness | Rect自身距离单位 | bg→Text→controller | 无换算；只有有效Rect basis为单位尺度时数值直接等于视觉半径 | 不参与空间计算，随几何变换 |
| Fill Color | controller Fill Color | 颜色通道数组 | Fill Color | 颜色通道，非几何空间 | bg→Text→controller | 无 | 无 |

对八个问题的明确结论：

1. Rect Size和source Position都会重新读取`sourceRectAtTime(time,false)`。background Position不读取rect，取controller中的[0,Text.position.y]作目标；Roundness/Fill仅读effect。
2. Rect Size和source Position都会乘source Scale的绝对值；source Position按未旋转的width/height×Scale计算布局。
3. Rect Size随后除source Scale，不是background Scale。background Position的fromComp是完整坐标逆变换，不是额外手工除Scale。
4. Rect Size/source Position缺少旋转AABB投影，公式有效几何假设是0°；有8°并不会触发错误，仍返回有限但错误的尺寸。
5. 没有显式检验background/source的world orientation相同。尺寸公式实际按source轴高宽工作，依赖一个与source尺度/轴关系兼容的背景basis；这与AE补偿后保持comp轴对齐的背景矛盾。
6. 四个背景表达式经parent找到Text，再经Text.parent找到controller；source Position通过parent找controller，并按refs找兄弟Text。
7. 历史公式先乘Scale、再加2×padding，表达的是缩放后的视觉间距意图；当前Create明确对comp AABB加padding。综合裁定：本Feature auto/普通2D契约的padding是**视觉comp-space AE unit**，不是source-local单位；本probe像素宽高比1时对应合成像素，不是UI缩放后的屏幕像素。UI仅写Padding X/Y、没有明确单位，单靠UI标签不能自证此结论。
8. 在有效parent/ctrl分支中，Rect Size完整重算并覆盖求值结果，初始pre-expression Size不参与公式；只在表达式关闭/缺失依赖的value分支保留作用。source/background Position也有value回退。不能据此说Create所有初始写入无意义：controller位置、Anchor、Scale、Rotation、parent和effect仍是动态几何输入，且初始值仍供禁用表达式等情况使用。

当前effect实际为Gap14、Padding[24,12]、Corner Radius28、Fixed Width320、Text Align1、Width Mode0、Gradient Enable0，Fill RGBA约[0.839216,0.698039,0.368627,1]。本轮不修改这些生产参数或UI。

### M1c-D0.3 无表达式的真实parent补偿

独立`A09_M1C_D0_PARENT_PROBE`（comp32，960×540/5秒/30fps/time0.5）创建两个Text/background对；没有Feature工具表达式。Text均Anchor[13,19]，S的Position[200,170]/Scale[140,90]/Rotation0；R的Position[600,320]/Scale100/Rotation8。背景已知Anchor[7,11]、Size[120,50]、初始Scale100/Rotation0。

准备、before读取、仅`background.parent=text`赋值、after读取是独立命令，赋值后没有再写背景Transform。结果：

| case | background Position 前→后 | Scale 前→后 | Rotation 前→后 | Anchor | 实际comp四角 |
| --- | --- | --- | --- | --- | --- |
| S | [330,150]→[105.857142857143,−3.22222222222226] | [100,100]→[71.4285714285714,111.111111111111] | 0→0 | [7,11]保持 | 前后完全相同：x=263/383，y=114/164 |
| R | [610,350]→[27.0778737162176,47.3163110526464] | [100,100]保持 | 0→−8° | [7,11]保持 | 前后完全相同：x=543/663，y=314/364 |

8个真实角点前后最大差0；另用after读回的child→parent affine独立重建comp点，最大误差`2.2737367544323206e-13`。Scale/Rotation补偿及这两个代表的最终comp变换保持已成为Host事实；不推导为任意非均匀缩放＋旋转组合的补偿证明，也不是产品PASS。

### M1c-D0.4 当前Rect Size公式的逐项重放

Node根据实际R1 B1值逐步计算，独立实现算术，没有调用生产bounds/Grid/fixture helper。固定容差仍1e-4；当前width mode=auto。

| 中间量 | Text A | Text B |
| --- | --- | --- |
| sourceRect W/H | 302.439988404512 /29.2800021916628 | 267.679993897676 /29.2800021916628 |
| source Scale /Rotation | [140,90] /0° | [100,100] /8° |
| background Scale /Rotation | [71.4285714285714,111.111111111111] /0° | [100,100] /−8° |
| abs Scale÷100：sx/sy | 1.4 /0.9 | 1 /1 |
| r.width×sx /r.height×sy | 423.4159837663168 /26.35200197249652 | 267.679993897676 /29.2800021916628 |
| +2×padding，w/h | 471.4159837663168 /50.352001972496524 | 315.679993897676 /53.2800021916628 |
| ÷source Scale，再max(0) | [336.7257026902263,55.94666885832947] | [315.679993897676,53.2800021916628] |
| AE实际expression value | [336.725702690227,55.9466688583295] | [315.679993897676,53.2800021916628] |
| 重放最大绝对误差 | 7.389644451905042e-13，PASS | 0，PASS |

具体错误项已复现：**A为重复Scale补偿**，真实背景净comp尺度已接近1，公式却再次除source Scale，连padding也被错误换算；**B为缺失rotated AABB projection**，仍用未旋转rect的高宽。更一般地，Rect输出所需空间与公式假定的继承尺度不一致。source Position也漏掉rotated高度，并假定Anchor始终跟随当前rect中心；内容改变后这一Anchor假定不可靠。没有发现需要改M1b adapter或strict measurement才能解释本次失败的证据。

### M1c-D0.5 两条策略与本轮A1候选

| 策略 | 几何路径 | 优点与限制 | D0裁定 |
| --- | --- | --- | --- |
| A：保留bg.parent=Text | source四角→comp AABB→comp padding→转换为background/Rect所需空间；背景中心另转换为Text parent-space Position | 不改组件拓扑；必须明确Rect group和background comp basis。若背景轴不与comp轴平行，逆变换目标框再取local min/max会再次放大，不能当任意affine通解 | 优先；本轮局部A1在下述包络通过 |
| B：source/background改为controller下同级 | 在共同controller空间显式测量和定位，translation-only父链下更直接 | 消除Text Scale的背景继承，但改变parent拓扑、表达式依赖、模板识别与下游兼容假设，不能仅替换一条Size表达式 | 只比较，不实施；当前已验证包络没有要求用B重构 |

A1仅安装在独立scratch副本，不修改生产：

- source Position：用rect、source Scale/Z Rotation投影视觉高度，按Gap/Padding排版；减去`R·S·(当前rect中心−Anchor)`，保证内容变化后视觉中心仍在controller局部目标。依赖仅朝向sourceRect/Transform/controller参数，不读取背景，不以自身Position的toComp递归自证。
- background Position：读取source四个comp角点的AABB中心，再用表达式语言`txt.fromComp(center)`给出其parent Text空间Position。
- Rect Size：先对source **comp** AABB四边加24/12 padding；四个扩展角点经表达式语言`thisLayer.fromComp`变到背景局部，再取宽高。没有按source Scale再除一次。该局部空间与Rect空间相同的前提是单一Pill identity group、Rect Position0、background Anchor0。
- Roundness和Fill Color沿用从当前源码提取的原body。此处toComp/fromComp是AE**表达式语言**，未替换M1b的Host sourcePointToComp adapter，也没有调用Host逆API修TBB。

初次逐层copyToComp准备返回空callback，随后只读确认只留下空comp48、没有测试层或候选结果；未把它计为PASS，空comp和命令保留。改为原R1合成的独立duplicate，得到`A09_M1C_D0_A1_COPY`（comp60），清除的表达式、重设的Transform/parent及新候选安装均只作用于副本。源Text为63/65，背景62/64，controller66；scratch comment明确脱离产品验收。原R1结束复读不变。

### M1c-D0.6 真实scratch结果与支持包络

两源使用非零Anchor[12,18]/[23,9]和非零求值Position；分别保持Scale140/90＋Rotation0、Scale100＋Rotation8。controller初始Position[440,260]。两背景在上述AE补偿后，实际comp basis为单位且轴对齐；Pill group的Anchor/Position0、Scale100、Rotation/Skew0，Rect Position0。对每个状态，Node从Host读出的Transform沿parent链独立逐角affine得到source comp AABB及padding目标，实际背景四角则直接读真实sourcePointToComp。比较left/top/right/bottom/width/height，并独立核对source视觉中心的stack位置。

| scratch状态 | Text A /Text B内容 | AABB最大误差A /B（AE unit） | 结果 |
| --- | --- | --- | --- |
| 初始，无外部parent | Feature Alpha /Feature Beta | 1.6599894308910734e-5 /3.6955188193132926e-5 | PASS |
| 内容变化，无外部parent | Feature Alpha Plus /Beta 2 | 4.110932388812216e-5 /1.6448566498183936e-5 | PASS |
| translation-only parent建立并平移 | 同上 | 4.110932388812216e-5 /1.6448566498183936e-5 | PASS |
| 已有translation parent下再次改内容 | Alpha 3 /Feature Beta Longer | 4.149377281237321e-5 /2.951303480358547e-5 | PASS |

外部Null的Anchor[11,7]、Scale100、Rotation0、无表达式；先Position[90,60]建立controller.parent，再仅改Null Position为[125,95]，真实组件comp中心从[440,260]移动至[475,295]。准备操作独立记录，没有Refresh。

合计4状态×2层＝8组AABB比较，最大误差`4.149377281237321e-5 < 1e-4`；独立stack中心最大误差`2.2737367544323206e-13`。每个状态10条候选/保留表达式启用且expressionError为空；没有NaN/Infinity或属性读取异常。padding实际一直[24,12]，comp.time一直0.5。最后状态额外重复只读采集，整个snapshot完全一致，误差稳定；没有放宽容差。没有把AABB验证称为pixel-alpha或圆角内每个像素的包裹证明，未做产品画面验收。

**已验证的严格包络**：普通2D point Text；本轮两组**静态**Scale/Rotation代表；非零Anchor/Position；动态文本内容；controller无外部parent或本轮一层translation-only Null；背景有效comp轴对齐、canonical单Pill group；auto宽、center布局及padding24/12。

**未覆盖/不得统一放行**：非均匀Scale与非零Rotation同层组合、建立parent后修改/动画Scale或Rotation、负/零Scale、其他宽度/对齐模式及padding值、任意parent旋转/缩放链、3D、skew/复杂或嵌套Shape group、motion blur、pixel alpha bounds。尤其不能把“comp角点逆变换后取local min/max”当作任意旋转背景都精确的方案。D0不改写Create/Refresh既有准入，也不宣布其所有Scale/Rotation组合已修复。

### M1c-D0.7 下一轮有界修复计划与停止

本轮局部候选满足指定最低实机条件，故停在 **DIAGNOSED / EXPRESSION FIX PLAN READY**。下一轮可围绕三个受影响builder（source Position、background Position、Rect Size）实施有界修复；Roundness/Fill保持现有body的前提仍为明确的Rect basis。生产化前必须把canonical group/背景comp轴约束及候选实际支持包络落实为可审查的准入或不变量，不得偷偷缩减/扩大现有支持面；对未覆盖组合及Transform动画须另行裁定，不能从本轮结果统一放行。

正式测试应分别覆盖表达式算术、实际parent补偿与独立comp-space目标；仅检查setter/pre-expression Size不能验证表达式引擎。表达式修改还会影响1839/1975行的Refresh模板检查和2701/2886行等A08精确模板识别，下一轮必须审查这一关联；本轮没有修改Refresh plan、A08或其支持契约。B类结构变更没有实施，当前测试包络无需它；超出包络需要什么结构仍不由D0推导。

原R1 REAL AE FAIL保持；没有Feature Create/Refresh、Grid、R2–R4、Undo、TBB动作或M2。M1b adapter/strict measurement、全部production expression template、正式测试、A08、schema/UI原字节保持。离线suite运行0次，无Git写操作。完整scratch命令、callback、表达式全文、逐点结果、中间量和hash只存`.tmp/vela-evidence/0.3.12/a09/m1c-d0/`；本轮Git证据仅追加本报告，不新增tracked JSON。

<!-- A09-M1c-D0 retention -->

| 最终证据 / 范围核对 | 结果 |
| --- | --- |
| 本轮tracked证据变化 | 仅主报告追加 17,250 bytes；完整报告 104,918 bytes；不新增tracked JSON |
| A09长期证据 | 当前Git已跟踪3份 / 125,851 bytes；两份既有未暂存summary 13,734 bytes原样保留；合计5份 / 139,585 bytes |
| 本轮local证据 | 206份 / 14,505,811 bytes，全部在上述ignored目录；含scratch原始callback、全文表达式、中间量、完整snapshot及hash inventory |
| 文件与现场保护 | 开始596份中595份原字节保持，仅本报告追加；原报告87,668 bytes前缀保持；R1前后15,089采集叶字段0差异，原R1失败状态未撤销/修复 |
| 收尾验证 | 新增local JSON解析、18个Markdown本地链接、格式、git diff --check、文件hash范围核对PASS；未运行正式离线suite或full regression |
| Git与停止 | 分支/HEAD与本地origin跟踪ref一致，index为空，无Git写操作；DIAGNOSED / EXPRESSION FIX PLAN READY仅指D0有界候选，生产未修改 |


## A09-M1c — Feature Dynamic Geometry Expression Fix（2026-09-12）

**A09-M1c IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING。** 本节是 D0 后经用户授权的生产化实施；原 AE 26.0x67 R1 Create 返回 ok:true、表达式求值后包裹失败的事实不改写。26.3x87 仍待复验；A09-M1 仍未 TARGETED_ACCEPTED。TBB **CONFIRMED / UNFIXED**，M2 未开始。本轮没有连接或操作真实 AE，没有 Create/Refresh/Grid/Undo/R2–R4 实机动作；报告中的 Create/Refresh/Detach 均明确属于离线对象替身。

### M1c.1 起点、范围与候选对应

沿用 `fix/host-coordinate-space-a09-0.3.12`，HEAD 与本地 origin 同名跟踪 ref 均为 `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`。未 fetch，也没有 Git 写操作；既有 dirty M1b/D0 工作树原样作为起点，没有重建昨日资产或旧机器证据。

实施前在 `.tmp/vela-evidence/0.3.12/a09/m1c/` 保存当前 host、相关 harness/test/report 小型快照、两个旧 builder 全文、D0 六份实际 A1 文件及 SHA inventory。before focused 记录为 1 场景、2 断言，预期在“旧 Create 尚无 V2”处失败；没有复制此前百万级 records。before Host SHA-256：`0c7ed0fa5c22d91f4d5d29b479cf01bb0995bca81455a955cb34c7112e539638`。最终 Host：`bbe741bacd5c9d08a4f13eb8aab35e172a3e7c70b6384554978e593122b235c6`（159646 bytes）。

候选全文来自 D0 本机 actual A1 文件，固化为小型正式 [expression contract fixture](../../scripts/fixtures/feature-expression-contract.js)。[生产 builder](../../host/tools/adComponentKit.jsx) 与 [新增 focused](../../scripts/test-feature-dynamic-geometry.js) 核对全文，未根据报告重新推导替代公式。

| 实际 D0 文件 | 原文件 SHA-256（含终止换行） | 最终 V2 body SHA-256（不含签名头/终止换行） |
| --- | --- | --- |
| a1-sourcePositionA.expression.txt | `7de2f926ccb71427ca6817a9cf1bf0dc7f3d5bfe431b54fa29b008046b1368d9` | `569cdc7b211150b1b47fa09307bb34040bf774212a7953439bbecf67008ba738` |
| a1-sourcePositionB.expression.txt | `01d4532cf55bbd9ce5d24a8d4b67c24e36540672d12b2376788653eca969d4d7` | `292c83a032b1f17f578984ede4d1e9284937038064aae342630939c4a9c9696f` |
| a1-backgroundPosition.expression.txt | `cd9ffe1973d57062f54f0aa4682087920a8f8cb9d830ea9e521784094bfcc665` | `3847a397d70b0b6e10d1750cec3d3e34138b811c337491f3cb030ad9fbb10b81` |
| a1-rectSize.expression.txt | `503e1c744d6ae051b529cc2fd3b4af80334803b58f12e544bcd8057b00615d59` | `374e7c7747ad553f8db78bc643c500486310c7a542594f2f80e9bb95af513174` |

Source hash 的动态实例使用 refs=[{i:1,n:"source0"},{i:2,n:"source1"}]、itemIndex=0/1；完整新 body 和三个旧 body 均留在 local。SHA 不声称不同命名/artifact 实例具有相同全文；正式测试先核对封装，再做以下有限规范化，逐字得到 D0 candidate：

1. 加入 body 注释 `// ACK_FEATURE_GEOMETRY_V2`；原七行 `LOMOND_CABINET_BINDING_V1` 仍是所有权/历史恢复协议，并未被误用为几何版本。
2. D0 两个固定 layer 名和 itemIndex 改为工具的动态 refs/index。保留“index+name，失败时按 name”解析；Create 要求引用名唯一且无字符串行终止符，Refresh 验证完整 canonical literal、源层顺序和 artifact 成员，允许旧索引随无关层插入而变化。几何函数、投影、视觉中心和 stack 算式保持 D0 正文。
3. 用户明确允许的最小参数守卫：三个 V2 body 均读取 Pill Width Mode/Text Align；用 Number 显式取得表达式 Slider 的数值，只接受 mode=0、align=1，其他值抛出 `ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required`。这使用户以后改 controller 参数时也不会静默套用 auto。guard 本身仍需正式生产真实 AE 复验。
4. 只规范化文本换行和末尾文件换行；未改变 D0 数学项。

Roundness 和 Fill Color 从保留的 V1 builder 直接复用，正文逐字未变；body SHA 分别为 `41ad088978ccf040269d10870ca264339606ed029b8742101a8047a63befe403` / `1d95548aee899a983c2ce5d53a1a8f61121db66d89cfb24920d484be54eb7fc2`。旧 source Position、background Position、Rect Size 全文保留为 LEGACY/V1；不删除旧公式的识别入口。

### M1c.2 几何契约与正式准入

Source Position 使用当前 sourceRect、Anchor、静态 Scale/Z Rotation，投影视觉高度并扣除视觉中心 offset；按照当前 Gap、Padding Y 排列。Background Position 使用 source 四角的 comp AABB 中心，调用**表达式语言** txt.fromComp(center)，得到 immediate Text-parent 所需 Position。Rect Size 使用四个 source comp corners，先在 comp space 扩展 ±Padding X/Y，再把扩展四角通过 thisLayer.fromComp 转为背景 local 并取 min/max。没有重复 source Scale 补偿，也没有用未旋转 local width/height 代替最终视觉尺寸。

Padding 延续 D0 裁定：视觉 comp-space AE unit；auto/center 当前支持。fixed width、其他 width/align 值在 Create/Refresh preflight 明确拒绝；启用后的 V2 guard 也拒绝它们，不实现未验证模式。Gap/Padding/Corner Radius 需有限且非负；Refresh 所读几何 controller 参数须静态、可读且无表达式，独立检查 raw mode/align 精确为 0/1，映射和默认值不能放行未知模式。

| 条件 | 本轮落实 |
| --- | --- |
| 源 Text | 普通 2D、finite positive sourceRect；静态 Anchor/Scale/Z Rotation；正 Scale；Position 无关键帧/分离维度/未知 driver；2D 向量可带中性 Z（A/P=0，Scale=100） |
| Rotation 约 0 | 正非均匀 Scale 可用，固定绝对阈值 1e-8 度 |
| 非零 Rotation | 正 uniform Scale；固定 ratio epsilon：abs(sx/sy−1) ≤ 1e-8；支持 133%/75% 等，未硬编码为 100% |
| parent | Create 未绑定源的原 parent 至多一层平移，已有绑定依完整 Feature 预检；Refresh source→controller，controller 无 parent 或仅一层外部平移；静态 A/P/S/R，Scale 距 100 的绝对阈值 1e-8 percentage point，Rotation 1e-8 度；非零 Anchor 按 Position−Anchor 计算平移 |
| 新背景 | Create 工具建立普通 2D、Anchor/Position 0、Scale 100、Rotation 0 后再 parent；canonical 单 Pill/Rect+Fill 来自工具 factory；源层准入保证使用 D0 所在的可补偿包络 |
| 已有背景 | Refresh 要求 background.parent===source、Anchor 0、静态背景 A/S/R、完整工具 Position；单 Pill group、仅 Rect+Fill、Rect Position 0、group A/P=0、Scale100、Rotation/skew/skew axis0、Opacity100、Fill Opacity100 |
| 实测 comp basis | 同一冻结 measurementTime 下调用 Host sourcePointToComp([0,0]/[1,0]/[0,1])；xVector≈[1,0]、yVector≈[0,1]，每分量固定 1e-4 AE unit。不可读、非有限或超差在 Refresh 写入前拒绝；不根据 local S/R 猜测 |

明确拒绝非均匀 Scale+非零 Rotation、零/负 Scale、3D、A/S/R 动画或表达式、未知 Position/父链 Transform driver、父链非单位缩放/非零旋转、循环或多级外部链、额外 Shape/group、非 canonical Pill、缺失/禁用/编辑过的模板、混合 V1/V2 几何版本、无法证明单位轴对齐的背景。Create 新增拒绝在 controller/generated 层、metadata、Anchor/Position 或表达式写入前发生；Refresh 全部读取及计划完成后才开始 Undo 和写入。没有 Create 后检查失败再冒称 preflight 的路径。

这不是持续监听用户 Transform 编辑：创建后修改/动画 source Scale/Rotation 可能破坏原补偿 basis；本轮支持动态文本内容，Refresh 会对当前 basis 再次拒绝超界。没有扩展 3D、复杂 skew/nested Shape、任意旋转/缩放父链、motion blur 或 pixel-alpha bounds。D0 实机证据仍仅覆盖既有 4 状态×2 层及其参数代表；本轮新增数学/准入覆盖不得表述成新增真实 AE 覆盖。

### M1c.3 V1/V2 兼容及消费者审计

新 Create 只写 V2。Refresh 对 source Position、background Position、Rect Size、Roundness、Fill Color 逐项核对完整 signed header + exact body，包括 artifact/kind/role 和历史字段的规范编码；不按签名前缀放行。V1 被作为 legacy exact 模板接受，在所有成员的 measurement、源层、参数、canonical group、basis、writable 属性检查成功后由 apply 重绑为 V2；V2 保持 V2。未知/编辑过/禁用的 body 或版本混合拒绝，失败不迁移任何一项。Refresh 保持已验证的 parent 关系，只写计划好的 Text-local center 并重绑，不再次 parent 重置补偿。

已有的精确工具 rebind Create 路径保留：遇到已有 Position driver 时，必须先对其完整旧 Feature 执行只读 Refresh 级预检，才可复绑；未知用户表达式不被接管。旧评论恢复元数据继续保留，A08 的 251 项回归覆盖此前 rebind 行为。

所有仓库 exact builder 消费者已检查：Create bind、Refresh template validation/rebind、Detach source literal parser、Detach 五类属性 expressionEdit。A08 只增加完整 V1/V2 body alternatives，仍保留 artifact/kind/role、空 protected-history、enabled、writable、当前帧采样、结构 locator 和 release 验证；执行计划保存**实际匹配的原表达式**。A08 的平移定稿边界不随 M1c 扩大，不允许 source Scale/Rotation 由此绕过 A08 原限制。

测试 factory 调整为“原生 Shape 内建属性在创建时存在、property lookup 不创建属性”，使新增 preflight 的只读证据可信；[locator 测试](../../scripts/test-ad-component-detach-locator.js) 两处额外 Rect 准备改用 addProperty，测试意图/断言不变。[finalize 测试](../../scripts/test-ad-component-detach-finalize.js) 的 unknown-body 注入改为匹配 V2 实际 var gap= 字面量，继续验证真实修改后拒绝。未删改 A08 其他保护场景。

### M1c.4 离线证据与边界

| 定向执行 | 实际结果 |
| --- | --- |
| 新 M1c focused | 139 scenarios / 749 assertions PASS |
| coordinate measurement | 201 scenarios / 1001 assertions PASS |
| A08 retained Detach | 251 assertions PASS |
| A08 F1/F1a finalize | 1134 assertions PASS |
| A08 F1b locator | 932 assertions PASS |
| Grid Host contract / Refresh | 120 / 106 assertions PASS |
| Host registry / Tool Catalog | 27 / 61 assertions PASS |
| Host JSON entry | 1122 assertions PASS |

coordinate 旧 create-rotation-scale 场景按本轮明确包络改为 nonuniform+8° Create 拒绝，快照及 mutation 为零；同一独立 AABB measurement 仍正确，原 M1b Host API/time/fault/state 场景继续覆盖。没有修改 sourcePointToComp adapter、1e-9 秒 epsilon 或 strict measurement，无 Host toComp fallback，也无 Host 逆 API。scope-preservation.json 对 measurement/Grid helper 区段（37,130 bytes）、Grid actions 区段（29,768 bytes）及 state（2,874 bytes）核对原字节一致；TBB 全文件 SHA 保持 `81d567dab983559969a75690d2d43a2c22089ca940d0ab7f93fa644b30da3a63`。

新增 focused 覆盖 V2/D0 全文、V1 旧全文、Roundness/Fill 不变、支持/拒绝边界、两版本 Refresh 迁移/保留、后续成员失败时无先行迁移、V1/V2 edited body 保护、A08 两版本及 wrapper churn、禁用/历史/错误所有权保护、exact Host basis 点及固定 epsilon。独立数学代表使用 140/90+0°、133/133+8°、非零 Anchor/Position、padding24/12、文本宽度变化、外部平移和非零 controller Anchor；8 个数学状态×2项 AABB，96 个数值分量/中心比较，最大差 1.1368683772161603e-13，固定容差 1e-4。完整 actual/expected/delta 留在 focused-records.json。

**这些 Node 结果不等于 AE expression engine 验证。** Node 中执行的是明确的 affine 替身；独立 expected 使用 center/half-extents comp AABB 投影，不调用生产 bounds/helper。offline PASS 证明 builder 文本、ownership、preflight、数学 oracle、mutation ordering、legacy migration 和回归；真实表达式语义当前依据仍只有 D0 scratch。正式 production V2、动态 refs/guard 和支持包络须另行 AE 验收。

最终生产/测试 hash 冻结后，`node scripts/run-all-tests.js` **只运行一次**：190 discovered / 190 executed / **190 PASS / 0 FAIL / 0 skip**。full-once.started.json 以独占创建锁防止重复，stdout/stderr/summary 原文留在 local；运行前后七个生产/测试文件 hash 未变。此处是本轮实际 190 结果，不改写 M1b 历史 189 结果。

### M1c.5 留存与停止

继续只追加本报告作为长期证据，不新增 tracked JSON 或大型 evidence 目录。新建两份正式测试源码是 suite/冻结输入，非 raw collection。完整 before/after/body/commands/log/records/hash inventory 均在 `.tmp/vela-evidence/0.3.12/a09/m1c/`。原报告 104918 bytes 前缀保持；既有 M1a/M1b real-AE 两份 summary 不改动。

收尾仅进行 i18n freshness、project consistency、JS/JSX 语法、JSON 解析、Markdown 本地链接、格式、git diff --check 和 hash 范围检查。精确 bytes 与检查结果见下方 retention 表。无 commit/push/PR/merge/tag，无 Git index 变化。停止于 **A09-M1c IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**；原 26.0 R1 FAIL 保留、26.3x87 待复验、TBB CONFIRMED / UNFIXED，M2 不开始。

<!-- A09-M1c retention -->

| 最终证据 / 范围核对 | 结果 |
| --- | --- |
| 本轮长期证据 | 仅本报告追加 14,529 bytes；完整报告 119,447 bytes；新增 tracked JSON 0 份 |
| 正式实施/测试源码 | 5 个既有文件调整、2 个新增 JS 测试/fixture；最终 7 份合计 270,878 bytes；本轮净增加 47,300 bytes（不含报告） |
| A09 长期证据总量 | Git 已跟踪 3 份 / 140,380 bytes；另保留先前 2 份未暂存 summary / 13,734 bytes；合计 5 份 / 154,114 bytes |
| 本轮 local 完整留存 | 106 份 / 829,465 bytes，全部位于 ignored m1c 目录，含 hash inventory 自身；manifest 列出其余每份文件 SHA |
| 收尾检查 | 29 项检查 PASS：i18n freshness、project consistency、七份 JS/JSX 解析与格式、JSON、23 个 Markdown 本地链接、diff check、报告前缀及代码 hash；原报告 104,918 bytes 前缀一致 |
| 唯一一次全量 | 190 discovered / 190 executed / 190 PASS / 0 FAIL / 0 skip；正式生产/测试之后未改动 |
| 停止 | IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING；无 Git 写操作、无 AE 产品动作；TBB CONFIRMED / UNFIXED |


## A09-M1c — targeted real AE revalidation / AE 26.0x67（2026-09-12）

**A09-M1c REAL AE PASS — AE 26.0x67。A09-M1 26.3x87 REVALIDATION PENDING。** 本节是当前 M1c production V2 的真实宿主定向验收，R1–R8 必需项全部通过；不授予 A09-M1 或 A09 的 TARGETED_ACCEPTED。M1c 实施轮 OFFLINE PASS 保持，本轮离线 suite 执行 **0 次**。原 AE 26.0x67 旧 M1b R1 的“Create ok:true、V1 表达式最终几何 FAIL”作为历史原样保留；R4 迁移后已由用户一次原生 Undo 忠实恢复该 V1 现场。TBB **CONFIRMED / UNFIXED**；M2 **NOT STARTED**。

### M1c-AE.1 装载证明与方法

用户保存工程、正常重启并重新打开 Lomond Cabinet；AE 从旧 PID 47404 变为 PID **30388**（本机启动时间 15:50:26，UTC+08）。通过实际 `.debug` 的 AEFT 8088 端口重新发现 CEP target，以 `CSInterface.evalScript` 进入真实 Host。宿主返回 `app.version=26.0x67`、buildNumber=67；工程为本机 `E:\Project EX\Project Vela Navis\Vela Test.aep`。本机 Extensions 目录自身就是当前工作树，不套用旧机器 junction 路径，也没有复制安装目录。

当前分支 `fix/host-coordinate-space-a09-0.3.12`；HEAD 与本地 origin 同名 ref 均为 `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`。沿用已记录的 dirty 实施工作树，未 fetch/checkout/stage，也未改生产或正式测试。Host 实际读取的 [adComponentKit.jsx](../../host/tools/adComponentKit.jsx) 文件字节与当前工作树相等：159,646 bytes，SHA-256 `bbe741bacd5c9d08a4f13eb8aab35e172a3e7c70b6384554978e593122b235c6`。实际装载的 createFeatureStack / refreshSelectedComponent 函数字符串与当前源码一致；catalogValid、lastLoadSucceeded 均 true，loadErrors 为空。未替换私有 closure 或强制 evalFile 重载。

最小 smoke 仅一次：真实 Text 的 `typeof sourcePointToComp === "function"`、`typeof toComp === "undefined"`，合法点返回两个 finite number。未重跑 M1a 完整能力探针，未调用 Host 逆 API。历史 V1 在任何迁移前已只读核对 10 条完整表达式及 ownership。

每次采集重新取得真实 comp/layer/property；B0/B1/B2 保留 identity/index、parent、comment/metadata、Transform、文本/sourceRect、完整属性树、关键帧、表达式全文/启用状态/error、comp.time、实际 Host sourcePointToComp 四角。Undo 比较使用预先固定的全部 snapshot 数据精确相等，selection/active viewer 不属于数据比较字段。独立 Node 几何仅使用 Host 读出的 Anchor→Scale→Rotation→Position 和 parent 链进行 affine 计算；不调用生产 bounds/helper、Grid helper 或产品 debug 返回作为真值。背景最终 AABB 对照实际 source 四角 AABB 扩展 ±24/±12，并逐项比较 left/top/right/bottom/width/height；source Host 四角另与独立 affine 核对，stack 中心/Gap 单独核对。固定绝对几何容差 **1e-4 AE unit**，未放宽；所有正常旅程的相关数值有限、表达式无 error。

### M1c-AE.2 R1–R4 正常旅程、动态 guard 与真实迁移

R1 新独立 comp `A09_M1C_R1_CREATE_26_0`（id79，960×540，5秒/30fps，time0.5）。Text A（id91）：初始 Anchor[12,18]、Position[200,185]、Scale[140,90]、Rotation0；Text B（id92）：Anchor[23,9]、Position[550,355]、Scale[133,133]、Rotation8。两源均为非空普通2D，无 parent/Transform表达式/关键帧。参数明确为 auto / center，padding24/12、Gap14、Radius28、FixedWidth320、Fill#D6B25E、Gradient关闭、按yPosition排序。

真实 registry `runRegisteredToolAction("ecommerceLayout", "createFeatureStack", paramsJson)` 一次返回 ok:true，controller94、background95/96 实际创建。三个几何 body 均为 CURRENT/V2，Roundness/Fill 为预期共享 body，10条全部启用且 error 为空。除 signature/artifact 和动态 refs/index 的实例差异外，正文逐字核对实施轮冻结文件。返回中的旧有 warning 文案 `Used comp-space bounds fallback for parented, rotated, or non-simple text layers.` 原样保留在 callback；没有 ACK_MEASUREMENT 错误，该文案不作为启用 Host toComp fallback 的证据。

| R1 项目 | stored / pre-expression Rect Size | expression-evaluated Rect Size | 最终 AABB 最大误差 |
| --- | --- | --- | --- |
| Text A | [471.415954589844,50.3520050048828] | [471.415983766317,50.3520019724965] | 9.155273397709607e-5 |
| Text B | [405.969421386719,112.111053466797] | [405.969419267588,112.111045031601] | 6.1035156932e-5 |

stored Size 与 Create 前独立 source comp AABB+padding 契约一致；expression-evaluated 背景最终几何也符合目标，未以初始 setter 值替代表达式结果。用户确认“画面正常，已 Undo 一次”，B2/B0 **5,101 个采集叶字段、0差异**。

| 组别 | 实际结果 | 独立几何 / 恢复证据 |
| --- | --- | --- |
| R2 动态文本 | 独立正常 V2 Create 后，仅修改两项内容为 Feature Alpha Plus / Feature Beta Longer；无 Refresh | 两背景 AABB 对 source+padding 的最大差均0；stack 最大差1.52587890625e-5；10条表达式无 error |
| R2 Width Mode guard | mode0→1时，6条几何表达式明确报 ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required；4条Roundness/Fill无 error | 仅恢复mode0，错误自行消失；15,089个叶字段与修改前0差异 |
| R2 Align guard | align1→0触发相同6条明确 guard；错误几何不计PASS | 仅恢复align1，无 Create/Refresh/重新启用表达式；15,089个叶字段0差异 |
| R3 V2 supported Refresh | 新副本 id115，一层 external Null：Anchor[11,7]、Position[90,60]、Scale100、Rotation0、静态；controller.parent=Null，两个Text内容再变更；一次Refresh ok:true | V2全文保持，背景单位comp basis；最终AABB最大差6.1035156022626325e-5；外部Null完整snapshot、identity/comment/parent/layerCount/time均不变 |
| R3 用户 Undo | 用户确认画面正常并一次原生Undo | B2严格恢复B0，17,513个叶字段0差异；准备动作未撤销 |
| R4 V1→V2 | 直接使用真实旧production资产 `A09_M1B_R1_CREATE_26_0`（id13）；先核对完整V1、metadata、准入与canonical basis，没有为准入修改原夹具；一次Refresh ok:true | 6条几何表达式整体迁移V2，4条Roundness/Fill全文不变，无混合版本；最终AABB最大差9.155273505712103e-5，metadata/identity/parent/time保持 |
| R4 用户 Undo | 用户确认“迁移画面正常，已 Undo 一次” | 15,167个叶字段0差异；原V1全文/hash和旧错误几何恢复。该恢复不改写旧M1b FAIL，也不算新回归 |

R2/R3 的复制 comp 在准备阶段产生 time0；R1/R4 为time0.5。所有被测动作前后 comp.time 一致，各 snapshot 的 requestedMeasurementTime 与当时 comp.time 相等；未传入旧 time 制造 mismatch，未重跑 M1a 时间探针。AE 的 guard error 文案包含本地化“表达式被禁用”，但实际 expressionEnabled 字段仍 true；恢复参数后 Host 求值自行恢复，完整原始 error 与状态均已留存。

### M1c-AE.3 R5/R6 fail-closed 与 R7 A08 双版本

R5A/R5B/R5C/R6 各用独立副本或新输入，准备动作与产品动作分开。每项仅一次 Create/Refresh，以下均为预期安全拒绝 PASS；拒绝后均未 Undo。B0/B1 是实际 Host 独立读回，包含 geometry、完整表达式、metadata/comment、层数、时间和父级；不以返回“no changes made”代替比较。

| 组别 / 准备边界 | 实际 preflight reason | B0/B1 精确比较 |
| --- | --- | --- |
| R5A 一个Text：Scale140/90 + Rotation8 | ACK_MEASUREMENT_FEATURE_UNSUPPORTED_NONUNIFORM_ROTATION | 2,555叶字段0差异，无controller/generated新增 |
| R5B external parent Scale110/110 | ACK_MEASUREMENT_FEATURE_UNSUPPORTED_TRANSLATION_PARENT | 17,513叶字段0差异 |
| R5C V2 Width Mode改为1，live guard先报错 | ACK_MEASUREMENT_FEATURE_UNSUPPORTED_PARAMETERS | 15,167叶字段0差异，表达式不迁移/改写；只恢复参数后guard与几何恢复，另15,167叶字段0差异 |
| R6 仅背景自身X Scale在准备阶段乘1.05 | ACK_MEASUREMENT_FEATURE_UNSUPPORTED_BACKGROUND_COMP_BASIS | 15,167叶字段0差异；表达式全文不变 |

R6 实际 Host 三点 basis：被修改背景 xVector=[1.0499877929689774,0]、yVector=[0,1]，固定1e-4下明确非单位；另一背景仍单位。这里记录 basis identity 检查的 false 是夹具预期，产品对它拒绝且零变化才构成 PASS。

R7 仅核对 M1c 增加的 A08 双版本 exact ownership。V2 取 R2 正常资产副本，V1 取已Undo恢复的真实旧资产副本；在各自独立准备操作中把 source/background Scale设100、Rotation设0，保留非零Anchor/Position，未编辑任何表达式正文。V1的10条全文hash与原旧资产一致，V2全文与其来源一致，证据见 local `r7-fixture-provenance.json`。这不把 R1/R3 的 Scale/Rotation 包络扩入 A08，也没有修改原旧R1。

两副本 time均设为1秒，source Opacity83，另建带独立comment/Opacity37的无关用户Null作为保留哨兵。分别通过既有 `AEToolbox.tools.adComponentKit.detachSelectedComponent()` 入口一次执行，均ok:true；各10条实际匹配版本的工具表达式清除并按当前帧求值定稿，内部parent释放、source原comment恢复、generated/controller工具comment清除。全部非目标属性与无关层保持；四层最终comp AABB相对定稿前最大变化均约3.051758e-5，采样写值与独立parent平移目标在既定容差内，Fill使用原A08的1e-6通道容差。用户分别确认V2/V1定稿画面正常并各一次原生Undo，**各17,512个叶字段0差异**，分别恢复原V2/V1全文。未运行完整A08矩阵，也未改注册/UI。

### M1c-AE.4 R8 state / 空几何 / Grid 与采集侧事件

真实空Text sourceRect=[left0,top0,width0,height0]。调用 schema 指定的 `AEToolbox.tools.adComponentKit.getState`：selectionCount1、textLayerCount0、twoDLayerCount0、canCreateFeatureStack=false、canCreateIconGrid=false。直接一次 Feature Create 返回 ok:false / ACK_MEASUREMENT_ZERO_SIZE_SOURCE_RECT；B0/B1 **2,555叶字段0差异**。没有制造API缺失/异常，没有Undo拒绝动作。

Grid 使用两个独立普通2D Text：无parent、Scale100、Rotation0、无表达式/关键帧。参数为2列、fitBox72×72、cell100×118、gap28/24、lastRow center、按xPosition排序。真实 registry Create Icon Grid 一次返回ok:true、warning空，controller265实际创建；实际 sourcePointToComp final角点与独立布局一致：两项宽度72、中心间距128，中心/尺寸最大误差1.6153244047245607e-5，comp.time0.5不变。用户确认“Grid 画面正常，已 Undo 一次”；B2/B0 **5,101叶字段0差异**。

完整保留三项采集侧事件，不改写原始回调或误判输出：

1. 初始本地路径比较器把 CEP 返回的 `file:///...` 当作文件路径，产生 false；按 file URL 规范化后，同一原始装载证据通过，没有再次装载/Host动作。
2. 本地 legacy 结构检查器最初误把 AE 原生 Blend Mode / Materials 叶属性当作非canonical内容；改为核对实际 Pill group 与其 Rect/Fill contents，保留首次误判文件，重算同一B0。未修改AE夹具或生产preflight。
3. Grid 准备循环创建第二个Text后只剩该层被选中。capture66的本地上下文guard在registry调用前退出，空callback原样保留；只读确认active comp正确、selectedCount1、仍两层，5,101叶字段0差异。补齐两层选择、重新保存B0后，capture71才执行唯一一次Grid产品动作。capture67是guard后的无动作快照，正式Grid B0/B1/B2为70/72/73；未重试已执行的产品动作。详情保留于 local `r8b-preparation-incident.json`。

正常支持路径没有 unexpected reject、几何超差、表达式错误、partial write 或 Undo 恢复失败；R5/R6及空几何拒绝均有正确原因与零数据变化证据。产品调用合计：Feature Create4次（正常2、预期拒绝2）、Refresh5次（正常2、预期拒绝3）、保留Detach2次、Grid Create1次。另有一次只读state、一次最小能力smoke；用户原生Undo共6次。后续真实AE操作到此停止。

### M1c-AE.5 覆盖、留存与停止

本轮真实PASS限定 AE **26.0x67**、普通2D point Text、静态正Scale、Rotation0下非均匀缩放及uniform133%下8°代表、auto/center、视觉padding24/12、动态文本、至多一层受支持平移父级、canonical且单位comp basis背景、精确V1/V2模板；A08仅原已接受的平移定稿包络。guard验证非auto/非center的拒绝与恢复，不意味着实现这些模式。未覆盖26.3x87、3D、任意父链旋转/缩放、skew/nested Shape、Transform动画、motion blur或pixel-alpha bounds。

完整commands/实际callback/B0/B1/B2/表达式全文hash/逐角AABB/guard/error/用户确认/Undo比较与inventory，仅保存在 ignored `.tmp/vela-evidence/0.3.12/a09/m1c-real-ae-26.0/`；`real-ae-summary.json`也仅local，不新增tracked JSON。原报告119,447 bytes前缀保持，既有dirty生产/正式测试与两份既有summary原字节保持。本轮仅追加本报告。收尾仅JSON解析、Markdown本地链接、格式、git diff --check、i18n freshness、project consistency及必要文件hash/bytes核对；不重跑190 suites，不做Git写操作。

停止于 **A09-M1c REAL AE PASS — AE 26.0x67 / A09-M1 26.3x87 REVALIDATION PENDING**。M1c IMPLEMENTED / OFFLINE PASS保持；旧M1b 26.0 R1 FAIL保留；TBB CONFIRMED / UNFIXED；M2 NOT STARTED。


<!-- A09-M1c real AE 26.0 retention -->

| 最终证据 / 范围核对 | 结果 |
| --- | --- |
| 本轮长期证据 | 仅本报告追加 14,594 bytes；完整报告 134,041 bytes；新增tracked JSON 0份 |
| A09长期证据总量 | Git已跟踪3份 / 154,974 bytes；既有两份未暂存summary 13,734 bytes原样保留；合计5份 / 168,708 bytes |
| 本轮local完整留存 | 821份 / 52,552,134 bytes，全部ignored；含hash inventory自身，manifest列出其余每份文件SHA |
| 工作树保护 | 开始598份中597份原字节保持，仅本报告追加；原119,447 bytes前缀一致；没有新增非ignored文件，index为空 |
| 收尾 | local JSON解析、Markdown本地链接、追加内容格式、git diff --check、i18n freshness、project consistency及hash范围核对PASS；全量/定向离线suite均0次 |
| 停止 | A09-M1c REAL AE PASS — AE 26.0x67；A09-M1 26.3x87 REVALIDATION PENDING；旧M1b 26.0 R1 FAIL保留；TBB CONFIRMED / UNFIXED；M2 NOT STARTED |


## A09-M1 状态裁定（2026-09-12，用户明确裁定）

**A09-M1 TARGETED_ACCEPTED — AE 26.0x67。AE 26.3x87 CROSS-VERSION REVALIDATION DEFERRED。**

接受基线为当前 M1b/M1c production：AE26.0x67 的 M1c R1–R8 全部PASS、6次用户原生Undo零差异，覆盖真实Create/Refresh、V1迁移、fail-closed、A08双版本识别及Grid；实施轮190/190 OFFLINE PASS保持，本次不重跑。此前26.3x87的旧M1/toComp失败和26.0x67的旧M1b/V1几何失败完整保留为历史，不删除或改写其原结果。

当前production未在26.3x87重验，**不记录26.3 PASS**；该版本兼容证据作为cross-version compatibility evidence debt保留，不再阻塞A09-M2。先前跨版本任务仅重新发现CEP并只读确认实际仍为26.0x67/PID30388，未执行26.3能力或产品动作，其local原始记录保留。上述裁定是用户明确接受26.0版本限定和证据欠项，不是推导出的跨版本通过。

A09整体仍未TARGETED_ACCEPTED；原支持包络保持，TBB仍 **CONFIRMED / UNFIXED**。按用户授权开始 **A09-M2-A0 — Text Background Box Forward / Parent-Space Conversion Reconciliation**，仅审计、独立scratch Host探针和fix plan，不实施生产修复。


## A09-M2-A0 — Text Background Box Forward / Parent-Space Conversion Reconciliation（2026-09-12）

**A09-M2-A0 AUDITED / HOST CONVERSION CONTRACT VERIFIED / FIX PLAN READY。** 本轮只审计当前工作树并验证 AE26.0x67 的有界坐标 API 语义；**TBB 仍 CONFIRMED / UNFIXED**，没有实施 M2 production 修复，没有执行正式 TBB Create、产品画面验收或 Undo。M1 按上节用户裁定为 **TARGETED_ACCEPTED — AE26.0x67**；26.3x87 跨版本复验 DEFERRED，作为兼容证据欠项保留；A09 整体未 TARGETED_ACCEPTED。

### M2-A0.1 当前真实入口和完整调用链

沿用同一 dirty feature branch；HEAD/origin 本地 ref 仍为 `6a7a417ec343ad6e566f4b9955686fe7e55dea6e`，不执行 Git 同步或写操作。重新从 `.debug` 发现当前 CEP target，真实 Host 返回 `app.version=26.0x67` / build67；当前进程30388延续上一轮正常重启后的宿主。本轮未改Host，不需要重载生产。实际 registry 中 `textBackgroundBox.actions[0]` 是 `id=create`、`hostFunction=AEToolbox.tools.textBackgroundBox.create`；catalogValid/lastLoadSucceeded 为 true，loadErrors=[]。

Host 实读 [textBackgroundBox.jsx](../../host/tools/textBackgroundBox.jsx) 字节与当前工作树一致，SHA-256 `81d567dab983559969a75690d2d43a2c22089ca940d0ab7f93fa644b30da3a63`。实际装载 create、copyTransformSnapshot、Util.setValueSafe 函数字符串与当前源码一致。ACK 文件仍为已接受基线 SHA `bbe741bacd5c9d08a4f13eb8aab35e172a3e7c70b6384554978e593122b235c6`。

客户端 `main.js:7935/7945` 的 runDynamicToolAction 收集 schema 参数、JSON stringify 后通过 evalHost 调用 `AEToolbox.runRegisteredToolAction('textBackgroundBox','create',paramsJson)`。[schema](../../host/tools/textBackgroundBox.tool.jsx):139–143 注册该 action；`host/index.jsx:220–267` 查实际 tool/action、resolveFunction，再调用真实 create 并捕获顶层异常。客户端按返回 ok 显示状态，不验证几何或空间。TBB 当前无独立 Refresh/stateAction，本轮不混入 ACK 的 action 路由。

| 分支 | 当前生产调用链 |
| --- | --- |
| Text | create:439 → createForSelectedLayer:421 → AE.isTextLayer（Text Properties判定）→ createForTextLayer:395 → AE.copyTransformSnapshot:409 → setLayerPositionAtVisualCenter:410 → addControls/buildShapeContents → moveAfter → 外层收集parentPairs/created++ → parentBackgroundsToSources:485 |
| visual / 非Text | create → createForSelectedLayer → createForVisualLayer:295 → layerVisualBoundsInComp:184 → createCenteredRoundedRect:258 → 外层最终parent |
| 无选择 | createDefaultRoundedRect:313 → createCenteredRoundedRect；默认100×100、padding0、roundness15；不依赖源层坐标API |

### M2-A0.2 输入/输出空间与写入先后

| 路径 / 当前行号 | 输入 → 必须输出 | 当前行为与风险 |
| --- | --- | --- |
| Text forward / 336–363 | sourceRect中心，Text source/local → comp point | 首选sourcePointToComp；抛错后toComp；都失败得到null后静默return。只检查truthy，没有严格number/finite/维度检查 |
| Text background 有parent / 365–391 | comp point → **当时bg.parent的local点**，用于Position | snapshot已把source.parent复制给bg；调用该parent.compPointToSource，抛错再fromComp，仍抛错则直接targetPos=compPoint。该fallback空间错误仍存在 |
| Text background 无parent / 376–381 | comp point → ordinary2D Position | 无parent且普通2D时，Position是Anchor的comp坐标，直接使用comp点是合法路径；当前代码没有显式2D/finite准入，不能推广到3D |
| visual bounds / 184–255 | sourceRect（或width/height）的四个local角点 → comp四角 → AABB | 仅调用layer.toComp，本机该Host API不存在。抛错返回null，在此层addShape前拒绝；对未抛错但非有限/短/无效返回并无充分验证 |
| visual/default新背景 / 258–334 | comp中心 → 新无parent2D Shape Position | Anchor0，Rect自身以0为中心；此处无需逆转换。随后才统一bg.parent=source，不能因为source有parent就把此处Position误算成source.parent-space |

Text 路径的关键顺序已从当前源码核对：

1. `createForTextLayer:396–398` 读sourceRect并算中心，但未验证finite/positive；`399–407` 已addShape、改name/startTime/inPoint/outPoint。
2. [aeUtils.jsx](../../host/aeUtils.jsx):204–251 的 copyTransformSnapshot 先写threeDLayer，存在源parent时调用setParentWithJump(source.parent)，失败再尝试parent赋值；随后复制Anchor、Position/分离轴、Scale、Orientation、X/Y/Z旋转。读值valueAtTime(t,false)失败会读value；写值经过吞异常的Util.setValueSafe。
3. `setLayerPositionAtVisualCenter:350` 又先写背景Anchor为source rect中心；forward在353、inverse在368之后才发生。因此“forward失败返回”不是无变更preflight。
4. forward静默返回后，调用者继续写controls、Rect Size/Rect Position/Roundness、Fill/Stroke及工具表达式，再return bg，外层created++。两次inverse抛错后会把compPoint交给parent-space Position和可取得的分离轴；返回的数组形状、finite值亦未独立校验。某些其他坏返回也可能抛出部分失败，不能把所有坏值都描述成同一种ok:true路径。
5. 最后 `parentBackgroundsToSources:428–436` 才执行bg.parent=source；这是与初始snapshot parent不同的第二次parent操作，依靠AE维持当前comp transform的补偿，异常仍被吞掉且created已计数。它不能证明前面的Position输入空间正确。

视觉分支的toComp抛错发生在本层addShape之前，但NaN等非抛错坏值可越过宽高 `<=0` 检查，经min/max传播到后续Shape写入。多选逐层创建、逐层catch：后面一层转换失败之前，前面成功层可能已经写入；不是全selection的转换preflight。当前公开错误返回只报告created/error数量，不展示内部每项错误原因。`AE.fitValueToTarget`只匹配二维/三维数组长度，不执行空间转换或finite验证；全局Util.setValueSafe在56–63吞setter异常。本轮不修改这些共享函数。

Text 分支的Rect Size来自source-local sourceRect+padding，背景复制source Scale/Rotation，所以padding保持source-local单位；visual分支先取comp AABB再建立无parent/单位Transform背景，其padding初始为comp单位。TBB表达式驱动创建时控件值，未实现M1的动态Text V2几何；M2不应顺便统一这些既有语义。

### M2-A0.3 独立真实Host probe

新建独立 `A09_M2_A0_HOST_CONVERSION_26_0`（comp266，960×540，5秒/30fps，time0.5），未复用旧JS wrapper，也未修改原M1资产。先通过独立准备脚本创建6层并设置Transform；随后只读采集API类型、sourceRect、A/P/S/R、parent、完整属性树。所有层普通2D、静态、无表达式/关键帧；parent仅一层平移。没有monkey-patch、没有制造异常、没有调用任何TBB产品函数或helper。

| 实际代表 | A / P（2D部分） | Scale / Rotation | parent |
| --- | --- | --- | --- |
| M2_FREE_TEXT，id280 | [12,18] / [200,185] | [140,90] / 0 | 无 |
| M2_NULL_CHILD_TEXT，id281 | [23,9] / [160,190] | [133,133] / 8 | M2_NULL_PARENT，id279 |
| M2_NULL_PARENT | [11,7] / [90,60] | [100,100] / 0 | 无 |
| M2_TEXT_CHILD_TEXT，id283 | [17,6] / [85,95] | [100,100] / 0 | M2_TEXT_PARENT，id282 |
| M2_TEXT_PARENT | [9,13] / [360,110] | [100,100] / 0 | 无 |
| M2_SHAPE，id284 | [20,10] / [600,350] | [100,100] / 0 | 无；单identity group矩形100×60 |

以上6个真实对象（Text / Null的ADBE AV Layer / ADBE Vector Layer）均为：sourcePointToComp **function**、compPointToSource **function**、toComp **undefined**、fromComp **undefined**。后两个仅读取typeof，没有调用缺失API。Null不代表普通AV footage/precomp；这两类本轮未新增逆API证据。

独立Node预先使用Host读出的Transform计算comp输入，不使用forward返回作为inverse真值：`local→减Anchor→Scale→Z Rotation→加Position→沿parent链`；inverse按相反顺序去除父链、减Position、逆Rotation、除Scale、加Anchor。每层sourceRect四角/中心及Anchor共6点；各真实forward、inverse调用重复2次。另对两个child的center/Anchor comp点调用其实际parent.compPointToSource。合计72次forward、80次inverse；原始返回和异常字段直接保存，未包装成功数组，所有调用无异常、返回二维finite number，重复结果完全稳定。

| 类型/代表 | forward最大绝对误差 | inverse最大绝对误差 | 结论 |
| --- | --- | --- | --- |
| free Text | 8.819252400371624e-6 | 7.823109599236489e-6 | PASS |
| Text under Null，133%/8° | 1.34171930312732e-5 | 1.3828276678395923e-5 | PASS |
| Text under Text | 1.5359372355305823e-5 | 1.5359372326884113e-5 | PASS |
| translation Text parent | 1.345202383618016e-5 | 1.3452023821969306e-5 | PASS |
| Null / canonical Shape | 0 / 0 | 0 / 0 | PASS |

固定绝对容差1e-4 AE unit，未放宽。compPointToSource结果是**被调用层自身的source/local空间**：即使该层自己也有parent，仍去除了整个祖先到comp的变换；不是comp坐标，也不是它的上级parent坐标。作为Position转换时，必须对“目标Position的实际parent”调用，而不是随意对source或background调用。

两个translation parent的关键数值清楚区分这些空间：

| child中心转换 | 独立comp输入 | 必须的parent-space点 | 实际compPointToSource |
| --- | --- | --- | --- |
| Null parent，P−A=[79,53] | [340.7911046873008,226.4689029795323] | [261.7911046873008,173.4689029795323] | [261.791107177734,173.468902587891] |
| Text parent，P−A=[351,97] | [528.5800017304716,172.0199993476272] | [177.58000173047162,75.01999934762719] | [177.580017089844,75.0200042724609] |

child Anchor comp输入[239,243] / [436,192]逆转换分别精确得到实际child Position[160,190] / [85,95]。可见非零parent Anchor必须计入；直接把comp中心写parent Position将额外偏移[79,53]或[351,97]。后者是独立数学反例，未在Host制造API异常或执行错误fallback。原6层API只读采集前后，**15,876个固定snapshot叶字段0差异**，comp.time始终0.5。

为把转换结果落实到background Position属性，又在**单独准备步骤**创建3个独立Shape：复制上述3个source的已读静态Scale/Rotation，Anchor设sourceRect中心，初始parent取source.parent，Position使用已取得的正确API值；建立padding0的简单Rect用于比较，不安装TBB表达式，不调用生产snapshot/geometry helper。再进行只读source/background四角及background Anchor comp采集。

| 独立背景代表 | 实际写入Position（2D） | 实际Anchor comp | center最大误差 / source与bg AABB最大差 |
| --- | --- | --- | --- |
| 无parent普通2D | [295.256011962891,156.164001464844] | 与Position相同 | 8.819252400371624e-6 / 1.5258788977234872e-5 |
| Null parent | [261.791107177734,173.468902587891] | [340.791107177734,226.468902587891] | 2.490433189450414e-6 / 3.0517578011313162e-5 |
| Text parent | [177.580017089844,75.0200042724609] | [528.580017089844,172.020004272461] | 1.5359372355305823e-5 / 3.0517578011313162e-5 |

三个Position合同均PASS，时间未改。此阶段增加27次正常forward读取；两阶段合计179次坐标API调用。它只验证scratch目标空间、当前静态Transform和API语义，不是正式TBB Create或最终reparent/Undo验收；没有自动把TBB改记为已修复。

### M2-A0.4 最小fix plan（本轮不实施）

1. **TBB私有strict转换。** 在本文件内加入ES3兼容的finite point/rect和当前time检查：不作Number coercion，严格检查number、至少二维、x/y有限；普通2D与中性Z条件须明确。forward统一使用真实sourcePointToComp，不调用不可用Host toComp；有parent时只采用经验证的parent.compPointToSource，不再保留fromComp或compPoint错误空间fallback。不引用ACK私有adapter、不修改M1逻辑，不建设通用Coordinate Framework。
2. **先形成只读计划，再开始mutation。** 冻结comp/time/source身份、当前parent、sourceRect和必要snapshot A/P/S/R；Text先算local中心→finite comp；以预定初始bg.parent=source.parent为依据，parent存在则必须算finite parent-space target，parent不存在且ordinary2D才用comp target。visual分支在addShape前严格转换四角、校验finite AABB和padding后的尺寸。API没有显式time参数，转换时必须对应被冻结的当前comp.time；本轮仅静态time0.5，不宣称新增动画time语义通过。
3. **推荐整个selection先完成转换预检。** 任一成员forward/inverse失败时，在可行范围内让全部成员的Shape/Anchor/snapshot/Position/controls/表达式写入都未开始。例：先有效Text、后无效转换成员，建议从现有“可能已创建1项再报错”收紧为preflight拒绝、count0、零相关mutation。这是建议的局部失败语义收紧，下一实施轮须明确记录，不能伪装成当前行为。
4. **维持两次parent的不同责任。** Text计划中的逆转换目标是source.parent，执行后先确认实际bg.parent与计划一致，再写预先计算的Position。最终bg.parent=source仍是另一个compensation步骤；应以TBB局部strict操作/读回确认其结果，不以吞错或created计数证明成功。不要在最终parent=source之后误写前一阶段parent-space坐标。visual/default初始bg无parent，直接comp Position，不额外套用Text逆转换。
5. **关键执行失败须可见。** 不全局修改Util.setValueSafe或共享AE.copyTransformSnapshot。TBB可局部使用已冻结snapshot的严格应用，或对所复用关键写入进行身份/值读回；parent、Anchor、Position及必要A/S/R若失败，不能继续ok:true。无法在新Shape创建前证明所有Host setter一定成功，故执行中失败应诚实报告incomplete/possible partial writes，不能声称自动回滚或所有错误都零变更。保留既有ok/count/message/selectionLabel公开形状，在message中暴露明确TBB-local转换原因；不借用ACK错误域，不改schema/UI。
6. **保留产品几何语义。** Text继续source-local Rect Size/Rect Position/padding，visual继续comp AABB，default继续100×100/roundness15及原style controls。不套用M1 V2动态表达式、不重构background/source parenting、不把文本中心定位修复扩大成像素alpha包裹或通用尺寸转换。

建议首个实机接受包络以本轮证据为起点：静态普通2D Text，无parent或单层translation-only Null/Text parent，非零Anchor/Position，已记录Scale/Rotation代表；canonical普通Shape正向角点。不能仅凭typeof=function放行3D、任意父链旋转/缩放、负/零Scale、Transform表达式/关键帧、分离Position、复杂Shape/skew/collapse。普通AV footage/precomp visual路径应保持明确的路径来源与逐类型证据要求，下一实施/验收轮补真实代表；本轮没有证明其全部inverse/产品路径，也不默默删除既有功能。**M1的uniform+rotation准入不得机械复制成TBB通用限制**，TBB的复制Transform/局部尺寸语义不同；未覆盖条件须明确裁定，不根据本轮少量代表统一放行。

### M2-A0.5 下一实施轮验证与停止

当前只读审查到的既有TBB相关正式测试主要是公共JSON入口、registry/schema及UI参数；不构成真实Text parent-space几何回归。本轮没有加载正式suite执行。下一实施轮需增加真正的TBB生产调用链harness：使用真实Host形态的sourcePointToComp/compPointToSource（toComp/fromComp缺席），独立affine oracle，覆盖无parent直接Position、非零Anchor平移Null/Text parent、正确目标parent身份、Text局部padding与visual comp AABB的区别、默认无选择分支。

失效用例仅在下一轮正式离线对象替身中构造：缺失/抛错/短/null/string/NaN/Infinity forward或inverse、不允许错误空间fallback、valid-first/invalid-last多选的零preflight mutation、关键parent/写入失败的诚实partial状态。当前真实Host未monkey-patch、未制造这些异常。之后另行授权真实TBB Create、最终几何、用户画面与一次原生Undo；本轮不提前宣告产品PASS。

全部scratch准备、实际callback、原始API返回、独立输入/预期、逐点误差、完整属性snapshot、源码审计副本和fix plan仅留在 ignored `.tmp/vela-evidence/0.3.12/a09/m2-a0/`。只追加本报告，原134,041 bytes历史前缀保持；前一跨版本任务raw原样保留。未修改生产/正式测试、共享Util、A09-M1 ACK、A08、schema/UI或既有summary；没有离线suite、TBB产品Create、Undo、commit/push/PR/merge/tag。

**停止：A09-M2-A0 AUDITED / HOST CONVERSION CONTRACT VERIFIED / FIX PLAN READY（AE26.0x67，有界静态2D）。** A09-M1 TARGETED_ACCEPTED — AE26.0x67；AE26.3x87 CROSS-VERSION REVALIDATION DEFERRED；TBB仍CONFIRMED / UNFIXED，M2生产修复尚未实施，A09整体未TARGETED_ACCEPTED。


<!-- A09-M2-A0 retention -->

| 最终证据 / 范围核对 | 结果 |
| --- | --- |
| 本轮长期证据 | 仅本报告追加 19,497 bytes（含M1状态裁定）；完整报告 153,538 bytes；新增tracked JSON 0份 |
| A09长期证据总量 | Git已跟踪3份 / 174,471 bytes；既有两份未暂存summary 13,734 bytes原样保留；合计5份 / 188,205 bytes |
| 本轮local完整留存 | 105份 / 4,161,440 bytes，全部ignored；含hash inventory自身，manifest列出其余每份文件SHA |
| 工作树与现场 | 开始598份中597份原字节保持，仅本报告追加；原134,041 bytes前缀一致；ACK/TBB/Util及正式测试未改；无API注入、无TBB产品Create、无Undo |
| 收尾 | JSON解析、Markdown本地链接、格式、git diff --check、i18n freshness、project consistency及hash/bytes核对PASS；离线suite 0次，Git index为空 |
| 当前状态 | M1 TARGETED_ACCEPTED — AE26.0x67；26.3x87跨版本复验DEFERRED；M2-A0 AUDITED / HOST CONVERSION CONTRACT VERIFIED / FIX PLAN READY；TBB CONFIRMED / UNFIXED；A09整体未接受 |

## A09-M2 — Text Background Box Coordinate Safety

本节记录 2026-09-12 的 M2 实施与离线验证。沿用 `fix/host-coordinate-space-a09-0.3.12`，以本轮开始时的 dirty 工作树为实施基线；没有重置或覆盖 M1 既有实现。此前 M1、M1b、M1c 和 M2-A0 的完整记录保持原文。M2-A0 的真实 Host 数值证据是实施依据，不把本轮 VM 验证表述为新增真实 AE 验收。

### 私有转换契约与写入边界

实际入口仍为 `runRegisteredToolAction("textBackgroundBox", "create", paramsJson)` → [原 TBB module](../../host/tools/textBackgroundBox.jsx)，注册 ID、schema、UI 和公开 JSON envelope 未更改。模块内部采用私有 ES3 helper，不建立共享坐标框架，不修改 `Util.setValueSafe`、`AE.copyTransformSnapshot` 或 ACK/M1 helper。

M2-A0 已在 AE **26.0x67** 观测并独立验证：`sourcePointToComp` / `compPointToSource` 为 `function`，Host layer 的 `toComp` / `fromComp` 为 `undefined`。本次生产只使用前两种 Host API；没有旧 API fallback、数学 Transform 替代 Host 转换、local point 冒充 comp point 或错误空间降级。

| 路径 | preflight 输入与结果 | execution Position 所需空间 |
| --- | --- | --- |
| Text，无 parent、普通 2D | 有效 sourceRect center → `source.sourcePointToComp` → `compVisualCenter` | `targetPositionSpace=COMP`；直接使用 finite comp point 是合法例外，不要求 inverse API |
| Text，受支持 parent | 上述 comp center → **实际初始 background parent，即 source.parent** 的 `compPointToSource` | `targetPositionSpace=PARENT_LAYER`；禁止把 comp point 当作 parent Position |
| non-Text visual | 类型化 source geometry → 四个 local corners → 每角严格 `sourcePointToComp` → finite positive comp AABB | 新建普通 2D background 初始无 parent，`COMP` Position；先定位再进行最终补偿 parenting |
| 无选择默认创建 | comp center，默认 100×100 | 无 source 转换，Anchor 0、COMP Position、padding 0、Roundness 15 |

转换输入及返回至少含两个 finite number；missing/non-function、throw、null、undefined、short、字符串数值、NaN、Infinity 均明确失败。visual 四角必须全部成功，不接受 mixed-space AABB；所有 rect/AABB 数值 finite，width/height 严格大于零。时间检查固定 **1e-9 秒**，继承 A0 已冻结裁定但不复用 ACK 实现：sourceRect 的 requested measurement time 必须匹配当前 comp.time；每次 conversion 前后及全计划结束时复核。没有 seek、替换 requested time 或 `valueAtTime` 数学模拟。

所有 selected layer 必须先完整形成只读 plan：source identity/type、time、sourceRect、local center、compVisualCenter、初始 parent、targetPosition、显式 Position space、静态 A/P/S/R snapshot、rect/padding、timing 和可预知支持条件。全部成功才进入 Undo group 和首个 `addShape`。valid-first / invalid-last 失败不会留下第一项 background，且不写 Anchor、Position、controls、shape contents、expression、comment 或 parent。

execution 使用已冻结数据，本地应用所需 Scale/Rotation snapshot 和最终 Anchor/Position，不再调用吞错的共享 `copyTransformSnapshot`，也不重新执行决定性的 forward/inverse conversion。普通 2D Scale 属性以三分量存储时保留 Z=100。先确认 background 的初始 parent 与计划一致，再写计划空间内的 Position；最终 `background.parent=source` 是独立的 AE 补偿步骤，并核对 parent identity 和有限 Transform。其真实最终可见几何仍须后续产品实机验收，本轮没有把 synthetic parenting model 当作 AE 渲染证明。

关键 Transform、controls、Rect 和 expression 写入使用 TBB 私有严格写入/读回检查，固定数值容差 **1e-4 AE unit**。不扩大全局 setter 或 Undo 体系。预检保证的是 **conversion/preflight failure 在首个相关工程写入前结束**；新建属性的 setter/addProperty/parenting 等仍可能在 execution 失败。此时 `ok:false`、`TBB_EXECUTION_FAILED`、已完成数量及 `partial changes may remain` 明确保留，停止后续项；没有自动 rollback，不把 Undo group 称为 transaction。

### M2 supported envelope 与既有几何语义

这是一轮有界支持准入，不是永久产品限制。放行当前 comp 内、unlocked、非 adjustment 的静态 ordinary 2D：

- Text：finite、positive Scale；Rotation=0 可 nonuniform Scale，非零 Z Rotation 限 uniform Scale；A/P 可非零。无 parent，或**单层**静态 translation-only Null/Text parent（Scale 100、Rotation 0、Anchor/Position 可非零）。不允许 Transform expression/keyframe 或 separated Position。
- Shape visual：无 parent、Scale 100、Rotation 0；单一 canonical rectangle group，group Anchor/Position/Rotation/Skew 为 0、Scale 100；可带普通 fill/stroke。任意嵌套 group、复杂几何/变换未放行。
- AV visual：保留 A0 已审计的普通 `FootageItem` 路径，无 parent、Scale 100、Rotation 0、无 collapse。其 strict four-corner 和类型化 fallback 有正式离线覆盖；**AV 本轮没有新增真实 Host 几何验收**。

3D、camera/light、precomp/collapse、任意 parent rotation/scale/deeper chain、负/零 Scale、nonuniform Scale 同时 Rotation、复杂 Shape/skew 均 fail closed。这里没有因 inverse 方法存在而推导任意 layer/相机投影受支持。

source fallback 有明确类型与状态区分：Text/Shape 必须有有效 sourceRect，不能借 layer.width/height 掩盖坏 rect；普通 AV **只有 sourceRect 方法不可用、抛出、返回 null/undefined 的 unavailable 状态**才能取 finite positive width/height。AV 已返回但 zero/negative/nonfinite/malformed 的 rect 同样拒绝，不能 fallback。此处不扩展 pixel alpha、stroke/effect 或 motion-blur bounds。

Text Rect Size/padding 仍是 source-local 单位，保留 snapshot basis 并最终 parent 到 source；visual Rect Size/padding 仍先从 comp AABB 建立，之后补偿 parenting。没有移植 M1c V2 dynamic geometry 或改变 TBB padding 定义。既有 fill/stroke/gradient controls 和 no-selection 默认行为均有回归。

### 稳定失败原因

保留公开 `ok/count/message/selectionLabel` 形式，preflight 返回 `ok:false,count:0`，message 含明确 TBB 私有原因；没有 ACK 错误码归属混用。

| 稳定码 | 区分的失败 |
| --- | --- |
| `TBB_INVALID_SOURCE_GEOMETRY` | source/local geometry、AABB、尺寸或 padded geometry 无效 |
| `TBB_SOURCE_TO_COMP_FAILED` | sourcePointToComp missing/non-function/throws |
| `TBB_COMP_TO_PARENT_FAILED` | 实际 parent 的 compPointToSource missing/non-function/throws |
| `TBB_INVALID_CONVERSION_RETURN` | 非至少二维 finite number；message 明示具体 forward/inverse method |
| `TBB_UNSUPPORTED_COORDINATE_ENVELOPE` | 类型、parent、Transform、timing、可预知 writable/support 条件未获准入 |
| `TBB_TIME_MISMATCH` | requested/current time 不一致、不可读或非 finite |
| `TBB_EXECUTION_FAILED` | execution 写入失败或读回异常；可能保留部分变更 |

### 正式 before / focused / 关联回归

新增 [TBB coordinate safety suite](../../scripts/test-tbb-coordinate-safety.js) 与 [native-object harness](../../scripts/fixtures/tbb-coordinate-harness.js)。它们通过已有完整 Host/includes loader 及真实 registry/module 执行，没有复制生产 helper 做替身。fixture 中的通用 affine matrix / inverse 是独立 Host substitute 和 oracle；API fault injection 仅存在于离线 fixture，本轮没有操作真实 AE API 或正式 TBB Create。

**生产修改前 before：4 场景 / 13 断言通过（缺陷复现，不记为产品 FAIL 计数）。** 保存了旧 forward 不可用时 addShape/Anchor 等已写入而返回 ok:true、旧 parent inverse 不可用时把 compPoint 写入 parent Position 且 ok:true、真实 Host 方法形态、旧 visual 只依赖 toComp 而拒绝 sourcePointToComp 可用层。旧生产 SHA 和 raw before 保留，后续 harness/suite 扩展不覆盖 before 结果。

**最终 focused：162 场景 / 906 断言 PASS。** 覆盖正确 comp/parent Position、非零 source/parent A/P、Scale/Rotation 代表、全部要求的 forward/inverse fault、每个 visual corner 失败、旧 API spy、时间一致性/漂移/不可用、Text/Shape/AV 类型 fallback、zero/overflow bounds、all-selection mutation ordering、默认及样式语义、critical setter silent failure 和后项 execution partial failure。记录 API inputs/raw returns/errors、public results、mutation events 与有序读写 timeline；NaN/Infinity/undefined 在 raw JSON 中显式编码。

| 关联回归 | 本轮最终结果 |
| --- | --- |
| Host JSON entry | 1128 assertions PASS，3 JSON environments |
| Host registry / Tool Catalog / core bootstrap | 27 / 61 / 56 assertions PASS |
| registry number support / schema i18n | PASS |
| A09 coordinate measurement | 201 scenarios / 1001 assertions PASS |
| Grid Host contract / Refresh idempotence | 120 / 106 assertions PASS |
| A08 Detach / finalize / locator | 251 / 1134 / 932 assertions PASS |
| M1c dynamic geometry | 139 scenarios / 749 assertions PASS |
| 其余已有 TBB consumers：procedural Home icons / determinism / palette editor；Vela actions / context Host / protocol | 44 / 1646 / 87；58 / 301 / 198 assertions PASS |

以上共 19 个关联 suite 最终通过。初次 Host JSON entry 失败日志保留：旧断言要求 TBB 的 Undo 边界异常向外抛出，而 M2 现在先做完整 preflight 并将 execution failure 纳入公开 JSON。仅对 [该 suite](../../scripts/test-host-json-entry.js) 的 TBB 用例提供合法 no-selection comp、保留同一 deliberate Undo fault，并精确断言有效 JSON 抵达一次原边界、失败 JSON 包含 marker、无效 JSON 不抵达边界；不削弱公共 parser 检查。更新后单项 1128 assertions PASS。开发时另有两处 harness 问题（cross-realm Array identity、故障 property getter 同时影响 evidence capture），均已修正，不是实机产品失败。

### 唯一全量、scope 与状态

最终状态只运行 **一次** `node scripts/run-all-tests.js`：**191 discovered / 191 executed / 191 PASS / 0 FAIL / 0 skip**。完整 stdout/stderr、命令、开始/结束时间、唯一尝试标记与实际计数保留在 local raw。没有预设沿用 190，也没有重跑全量。

全量前冻结 244 个 Host/测试文件，之后未修改这些文件。TBB 生产 SHA-256 为 `ec492eafdfd3a90dbb2bbf5cde24668aea924474477e275ac65af15a9e9e2a12`；M1 ACK 整文件 SHA-256 仍为 `bbe741bacd5c9d08a4f13eb8aab35e172a3e7c70b6384554978e593122b235c6`。scope preservation 相对本轮起点核对全部文件，而不把历史 dirty diff 误认成本轮修改；M1 实现、M1 focused/fixture、A08、共享 Util/AE、schema/UI 均保持原哈希。本轮只修改 TBB production、Host JSON entry 的关联 fixture 用例，新增 TBB 正式 suite/harness，并追加此主报告；不新增 tracked evidence JSON。

收尾：JS/JSX syntax（Node syntax/VM compilation，加 ES3 人工语法检查）、JSON parsing、Markdown 本地链接、格式、`git diff --check`、i18n freshness、project consistency、冻结 hash 与 scope preservation 均 PASS。完整 raw/commands/before/after/fault/mutation events/focused/full logs/source hashes 保留于 `.tmp/vela-evidence/0.3.12/a09/m2/`（ignored）。本轮报告追加 **12474 bytes**，主报告现为 **166012 bytes**；Git 已跟踪的 A09 证据文件当前合计 **186945 bytes**。本轮 local raw 共 **127 files / 1178095 bytes**（含 hash inventory 自身大小，不递归声明自身 SHA）。正式 production/tests 属于本轮授权交付，不将 raw 采集加入 Git。

最终停止状态：**A09-M2 IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。TBB 更新为 **TBB COORDINATE FIX IMPLEMENTED / REAL AE REVALIDATION PENDING**；历史 `CONFIRMED / UNFIXED` 仍作为历史原文保留。本轮没有执行真实 TBB 产品 Create、Refresh 或 Undo，未进入 0.3.12-C1 或其他项。

M1 继续 **A09-M1 TARGETED_ACCEPTED — AE 26.0x67**；**AE 26.3x87 CROSS-VERSION REVALIDATION DEFERRED** compatibility evidence debt 保留，不能写 26.3 PASS。**A09 整体仍未 TARGETED_ACCEPTED**。没有 commit/push/PR/merge/tag 或其他 Git 写操作。

## A09-M2 — targeted real AE revalidation（AE 26.0x67，2026-09-12）

**A09-M2 REAL AE REVALIDATION FAIL — AE 26.0x67。** R1 普通无 parent Text 在真实 registry Create 中被 preflight 误拒，已按本轮失败纪律停止；R2–R7 未执行，不重试、不现场改代码、不放宽容差。M2 的 `IMPLEMENTED / OFFLINE PASS` 是保留的实施事实，不等于本次实机通过；TBB 当前为 **COORDINATE FIX IMPLEMENTED / REAL AE REVALIDATION FAIL**，尚未 TARGETED_ACCEPTED。M1 继续 **TARGETED_ACCEPTED — AE 26.0x67**；AE 26.3x87 compatibility evidence debt 继续 **DEFERRED**。A09 整体仍未 TARGETED_ACCEPTED，也不是 INTEGRATED_ACCEPTED/CLOSED。

### 新进程、当前 Host 与最小能力证据

本轮开始时 AE 仍是 M2-A0 进程 PID 30388。按附件第一节请求正常重启；用户回复“已重启，面板就绪”后重新发现 `.debug` 指定的 AEFT 8088 target，经当前 CEP `CSInterface.evalScript` 读取真实 Host，不复用旧 target/Host 闭包。新进程 **PID 47648**，启动时间 `2026-09-12T19:53:27.1312395+08:00`，Host `app.version=26.0x67`、`buildNumber=67`。

实际 Host 读取的 `textBackgroundBox.jsx` binary bytes 与工作树完全一致，SHA-256 **`ec492eafdfd3a90dbb2bbf5cde24668aea924474477e275ac65af15a9e9e2a12`**；公开 `create.toString()` 与当前 M2 源码经空白规范化后匹配。registry/catalog valid、last load succeeded、`loadErrors=[]`，实际 action 仍为 `textBackgroundBox/create → AEToolbox.tools.textBackgroundBox.create`。M2 实施轮冻结的 **244 个 Host/测试文件逐个 hash 一致**。

在本轮 R1 普通 2D Text 上完成一次最小 API smoke 判定：`sourcePointToComp`、`compPointToSource` 为 `function`；`toComp`、`fromComp` 为 `undefined`。没有重跑 M2-A0 完整 probe。本轮 R1 B0 四角正常调用 `sourcePointToComp`，均返回至少二维 finite number，无 invocation exception；独立 A/P/S/R 计算的 source comp AABB 与实际四角 AABB 最大误差 **0.00001525878903407829 AE unit**，通过原定 **1e-4** 容差。这只证明该 source 的前向几何读取，不能替代未成功的产品结果。

### R1 fixture、B0 与唯一 Create

准备动作使用独立 Undo group，新建 `A09_M2_R1_TEXT_26_0`（comp id 288，960×540，5 秒，30 fps，time=0.5），source `A09_M2_R1_SOURCE`（layer id 300，index 1），Text `R1 Coordinate`，ArialMT 40，白色 Fill。source 无 parent，普通 2D、静态，无 Transform expressions/keys；Anchor `[12,18,0]`、Position `[330,275,0]`、Scale `[140,90,100]`、Rotation 0。旧 M1/M1b/M1c/M2-A0 资产未改动。

真实 sourceRect 为 `{left:3.14453125, top:-29.12109375, width:253.125, height:29.609375}`。动作前保存 B0，并从真实 Transform/sourceRect 独立计算：

| B0 独立几何 | 数值 |
| --- | --- |
| source comp AABB L/T/R/B | `317.60234375 / 232.591015625 / 671.97734375 / 259.239453125` |
| source comp visual center | `[494.78984375,245.915234375]` |
| 此无 parent 路径所需的初始 Position space | `COMP`，target 等于上述 comp center |
| source-local padded rect | `left=-20.85546875, top=-41.12109375, width=301.125, height=53.609375` |
| 期望最终 background comp AABB L/T/R/B | `284.00234375 / 221.791015625 / 705.57734375 / 270.039453125` |
| 期望最终 background comp AABB W/H | `421.57499999999993 / 48.24843750000002` |

真实调用一次 `runRegisteredToolAction("textBackgroundBox","create",paramsJson)`。明确 schema 参数：`paddingX=24,paddingY=12,cornerRadius=15,enableFill=true,fillMode="Solid Fill",fillColor="#D6B25E",fillOpacity=100,enableStroke=false,strokeMode="Solid Stroke",strokeColor="#FFFFFF",strokeWidth=2,strokeOpacity=100`。没有直接调用私有 helper，独立目标没有复用 TBB 生产算法。

原始 public result：`ok:false,count:0,selectionLabel:"1 layer(s)"`；message 全文为 **`TBB preflight: Error: TBB_UNSUPPORTED_COORDINATE_ENVELOPE: Source identity/parent changed during preflight.`**。动作前后 comp.time 均为 0.5。真实 background 未创建，layer count 仍为 1；因此最终 parent compensation、expression-evaluated geometry、画面正常以及 native Undo 均不能判 PASS。

该 message 来自 [当前 M2 的 identity/parent 复核](../../host/tools/textBackgroundBox.jsx)。B0 与 B1 外部快照中的 source id/parent 并未变化；当前证据只能确定“受支持正常 Text 被该 preflight guard 误拒”，不能据此声称已找到 private plan 内部偏差的根因。本轮不插桩、不 monkey-patch、不重试产品动作，也不现场改 production/tests。

### B1 零差异与停止范围

在返回失败后只读保存 B1，按动作前已冻结的严格比较域核对 B0/B1：**2555 个 leaf fields，0 差异**。包括 comp/time/layer count、source identity/index、parent/comment、Transform 值/表达式/keys、sourceRect、完整已采集属性与 relevant Shape/Effects，以及实际 source 四角返回。这个结论限于所采集字段，不宣称对未采集工程状态做了事务证明。

没有执行 native Undo，避免撤销 R1 fixture 准备；没有 B2。用户画面确认不适用（没有创建 background），不以空场景确认代替产品验收。R2 Null-parent、R3 Text-parent、R4 Shape、**必需的 R5 AV**、R6 selection-wide fail-closed 和 R7 default 均 **NOT EXECUTED / NOT COVERED THIS RUN**；AV fallback REAL AE 仍 **NOT COVERED**。没有人为触发 API/setter/addProperty 异常或 NaN。

收尾仅做 JSON parsing、Markdown links、format、`git diff --check`、i18n freshness、project consistency 与 hash/scope preservation，全部 PASS；**未运行任何 offline suite**。本轮工作区原有 600 个 non-ignored 文件中，只有主报告追加，其余 599 个保持原 hash，未新增 non-ignored 文件；244 个实施冻结 Host/测试文件仍全部一致。完整 raw 位于 `.tmp/vela-evidence/0.3.12/a09/m2-real-ae-26.0/`，包括 load/target/进程证明、唯一 Create raw callback、R1 B0/B1、独立几何、严格零差异比较、重启确认、命令和 hash inventory。主报告新增 **6643 bytes**、现为 **172655 bytes**；Git 已跟踪 A09 evidence 合计 **193588 bytes**；本轮 ignored local evidence **79 files / 1060091 bytes**（计入 inventory 自身大小，不声明自身 SHA）。未新增 tracked summary，不 commit/push/PR/merge/tag。

停止于 **A09-M2 REAL AE REVALIDATION FAIL — AE 26.0x67 / R1 PREFLIGHT FALSE REJECTION**。后续需单独裁定该自然误拒的诊断与修复；本轮没有继续后续验收组或进入其他 0.3.12 项。

## A09-M2-F1 — Identity / Parent Validation Repair（2026-09-12）

本轮从 R1 `Source identity/parent changed during preflight.` 自然误拒出发，先做精确 guard 诊断及修复前完整 registry 反例，再实施 TBB 私有身份修复。没有真实 TBB Create、R2–R7、Undo、selection/time/parent/Transform 操作，也没有更改原 R1 资产。此前 R1 实机 FAIL、唯一 Create `ok:false/count:0`、B0/B1 **2555 个所查字段零差异**仍完整保留在上一节及原 local evidence 中。

### 实际根因及证据层次

当前修复前 [TBB 模块](../../host/tools/textBackgroundBox.jsx) 中，目标错误全文只有 **一个抛出点**，对应：`plan.source && (plan.source.id !== plan.sourceId || !sameLayer(plan.source.parent, plan.parent))`。旧 `planLayer` 在末尾创建 plan，保存 `source` 操作引用、`sourceId:source.id` 标量、`parent` 操作引用及 `parentId`；无 parent 时真实值为 `null`。**containingComp 标量未冻结**；`parentId` 实际未被复核使用。`sameLayer` 读取两端 parent 引用上的实时 layer id/containingComp id；这里没有直接比较 Layer/Comp wrapper 引用，也没有比较 snapshot/array 的对象引用。

旧 helper 的全文关键式为：`return !a && !b || !!a && !!b && a.id === b.id && a.containingComp.id === b.containingComp.id;`。根因是 **AE 26.0x67 对该未分组混合 `||`/`&&` return 链的实际求值与 Node 不同**：同为 null 时，`!a && !b` 为 true，但完整式返回 false。显式分组 `( !a && !b ) || ( !!a && !!b && ... )` 和显式分支在同一 Host 均返回 true。这里没有把问题预设为 wrapper churn，也没有从错误文案或外部 B0/B1 零差异推导 private plan 必定正确。

只做 **两次最小只读 evalScript**，分别重新发现真实 CEP target。第一次按 id 查找并核实 `A09_M2_R1_TEXT_26_0` / `A09_M2_R1_SOURCE`，确认 comp id 288、layer id 300、index 1、layer count 1、time 0.5、selected id 300，工程仍为 `E:\Project EX\Project Vela Navis\Vela Test.aep`。在同一次调用内保留 source A，再经 `comp.layer(index)`、`comp.selectedLayers[0]` 和 `source.containingComp` 重新读取 B；本次这些 `===` 均为 true。没有使用跨 evalScript 的 JSON 引用作证明，没有把 name/index 当稳定身份。

**真实 private plan 没有被导出或重新执行。** 下表中的“计划端”是按当前源码构造的身份字段**诊断镜像**；原生 source/id/parent 及表达式的求值来自真实 Host。完整属性树没有再次采集。证据在 `01-guard-read.json`；进一步的纯逻辑对照在 `02-logic-read.json`。

| 条件表达式 | 计划端来源 | 当前端来源 | Host 实际值 / typeof | 结果 / 短路 | 证据来源 |
| --- | --- | --- | --- | --- | --- |
| `plan.source.id !== plan.sourceId` | 镜像构造时复制 `source.id` | 镜像保留的 source 引用重新读 `.id` | `300 / number` 对 `300 / number` | false；因此继续 parent 分支 | 同次 Host 原生字段读取 + 源码镜像 |
| 旧 source/containingComp 准入 | `comp.id`，旧 plan 中没有独立 compId | `source.containingComp.id` | 均为 `288 / number` | 标量一致；旧 plan 后续缺少冻结 compId 保护 | Host 字段 + 源码追踪 |
| parent 两端是否严格 null | 镜像 `parent:source.parent` | 再读 `plan.source.parent` | 两端 `null / object`，`===null` true，`typeof===undefined` false | 不是遗漏字段或 undefined 差异 | 同次 Host 原生读取 + 镜像 |
| `!a && !b` | parent 镜像 | 当前 parent | 两项均 `true / boolean` | true | Host 子式求值 |
| 完整旧 `sameLayer(a,b)` | 同上 | 同上 | 两端严格 null，结果 `false / boolean` | 错误地判不匹配；parent 的 id/compId 属性比较未抵达 | Host 精确表达式镜像；短路路径结合纯逻辑 trace 判读 |
| `!sameLayer(...)` 及外层 guard | 上述镜像 plan | 上述镜像当前值 | `true / boolean` | 镜像触发与产品相同的唯一错误 guard；不称历史 private plan 读数 | Host 镜像 + 唯一生产抛出点 |
| `left(true) || middle(false) && right(false)` | 全为调用内局部布尔值 | 无 Host 对象 | false；trace=`left,right` | `middle` 被短路，但随后 `right` 仍求值 | 第二次纯逻辑 Host probe |
| `left(true) || (middle(false) && right(false))` | 同上，显式分组 | 无 Host 对象 | true；trace=`left` | 右侧完整分组被短路 | 第二次纯逻辑 Host probe |

纯逻辑 probe 还对照了 null/null、相同标量身份但不同普通 JS 对象、不同身份、null/object、object/null：只有旧未分组的 null/null 路径异常；分组和分支版本符合预期。上述证据明确限定为所测表达式的行为，不宣称已实现/验证完整 ExtendScript 运算符解释器。

### 修复前完整模块反例与最小实现

在生产修改前，新增 [身份 focused suite](../../scripts/test-tbb-identity-safety.js)，通过完整 Host/includes + 实际 registry 执行原 M2 TBB，取得 **2 场景 / 10 断言 PASS 的缺陷复现**（不是产品 PASS/FAIL 计数）：

- 原 R1 无 parent、Anchor `[12,18]`、Position `[330,275]`、Scale `[140,90]`、相同 sourceRect 的完整 Create，在目标 preflight guard 返回 `ok:false/count:0`、0 mutation events。
- 无选择 default 的完整 Create 通过默认 plan，但初始 background parent 读回复用了同一 `sameLayer(null,null)`，在 **addShape 之后**返回 `TBB_EXECUTION_FAILED`。这是本轮源码审计发现的完全同根比较，不是执行了真实 AE default Create。

Node 原生求值会掩盖该根因，故 [有界 logical-return 模型](../../scripts/fixtures/extendscript-logical-returns.js) 对载入的**完整 TBB module**做通用未分组逻辑 return 链的等效左向分组；不复制 TBB guard/helper/算法或按函数名替换结果。模型先用真实 Host 的纯逻辑对照校准。已有 [完整 Host loader](../../scripts/fixtures/host-json-entry-harness.js) 只新增可选 source transform，默认路径不变；[TBB native-object harness](../../scripts/fixtures/tbb-coordinate-harness.js) 仅身份 focused 显式启用该模式。没有构建 wrapper churn/cache，也不把模型称为真实 AE 产品验收。

生产修复限定在当前 M2 四个身份边界：

1. source/containingComp 准入：读取合法正整数 number ID，getter 异常、缺字段、非法 id 均明确拒绝；layer identity 同时绑定 **compId + layerId**。
2. plan 建立及结束复核：在几何测量前复制私有 `sourceIdentity`、`parentIdentity` 标量快照，保留独立的 `source`/`parent` 操作引用。只有严格 `null` 表示无 parent；有 parent 则保存其 compId/layerId。末尾对重新读取的当前身份进行匹配，预期值不再从旧引用上的“当前字段”重读；旧 `sourceId` / 未使用的 `parentId` 被这一条明确数据通路替代。
3. 初始 background parent 读回：对照冻结 `parentIdentity`，无 parent 使用显式 null 分支，包含 default；不让相同空 parent 在写入后误拒，也不接受 undefined/false/0/空字符串冒充无 parent。
4. 最终 `background.parent=source` 读回：对照冻结的 `sourceIdentity`，不追随 execution 期间变化的 source 引用身份。赋值失败、读回异常或真实身份不同仍报告 `TBB_EXECUTION_FAILED` 和可能的 partial changes。

新的 `sameIdentity` 使用显式 null 分支及纯标量 `compId/layerId` 比较，移除已证实有问题的未分组链。标量快照在私有 plan 中保持不再修改；不依赖 ES3 不具备的 `Object.freeze`。missing/异常/非法 ID 不被归一为空 parent。parent chain 的无更深 parent 判断按相同严格 null 约定读取，仍只承认原有的单层 translation-only Null/Text 包络。

没有删除 drift guard，不以 name/index/String(object) 寻址，不建 A08 locator 副本或通用身份框架。source id/containingComp 改变、source 读取失效、parent null↔对象、同名同 index 但不同身份的 parent 替换、保留 parent 引用自身 id/compId 漂移都仍拒绝；后一 selected layer 的身份失败也在第一项 background 创建之前结束。身份匹配没有替代 time、Transform、support 或空间检查。

### 正式测试与 scope preservation

**F1 focused：70 场景 / 352 断言 PASS。** 覆盖上述原 R1 / default 反例修复、Null/Text parent 正常、身份缺失/非法/不可读、source/containingComp/parent 漂移、同名同 index 身份替换、多选项变化零写入、初始/最终正常读回、throw/静默忽略 parent 赋值以及 execution 期间 source id 改变后的 partial 拒绝。完整 **TBB coordinate safety 仍为 162 场景 / 906 断言 PASS**，该 suite 文件本身未改。

10 个关联 suite 均 PASS：Host JSON entry 1128、Host registry 27、Tool Catalog 61；A09 coordinate measurement 201 场景/1001 断言；Grid contract/Refresh 120/106；A08 Detach/finalize/locator 251/1134/932；M1c dynamic geometry 139 场景/749 断言。测试开发中两处 fixture/assertion 适配（允许准备同 index 负向代表；严格 final-parent 缺失实际返回 identity read failure）均在全量前处理，未掩盖产品 mutation 或放宽成功条件。

逐字节核对 **21 个无关 TBB helper**及 plan 内几何计算区段未变：包括 forward/inverse conversion、finite/point/time/rect 检查、source geometry fallback、Transform/Shape support 计算、padding/options/controls/shape expression、严格 property setter。M1 ACK、共享 `host/aeUtils.jsx`（含 Util/AE helpers）及其他所有生产模块均保持本轮起点 hash。没有改坐标公式、支持的 Transform/parent 类型范围、padding 语义、M1 ACK 或正式 M1/A08 suite。

最终稳定状态仅运行 **一次** `node scripts/run-all-tests.js`：**192 discovered / 192 executed / 192 PASS / 0 FAIL / 0 skip**。完整命令、开始/结束时间、stdout/stderr、唯一尝试标记与实际计数保留于本轮 raw；没有预设 191，也没有重跑全量。

全量前冻结 **246 个 Host/测试文件**；最终 TBB SHA-256 为 **`a2e00da70cb92191f58f2b28f48613fc10933f88f20bbc997c807adb22606152`**。M1 ACK 仍为 `bbe741bacd5c9d08a4f13eb8aab35e172a3e7c70b6384554978e593122b235c6`。原 M2 的 191/191 全量与此前真实 R1 FAIL 均保留历史归属和原日志，不改写为 F1 结果。

收尾的 JS/JSX syntax（Node/VM 加 Host ES3 人工语法检查）、JSON、Markdown 本地链接、format、`git diff --check`、i18n freshness、project consistency、hash/scope checks 全部 PASS；全量后 246 个冻结文件未变。完整诊断/原始 Host callbacks/before/after/命令/测试日志/source hashes 位于 `.tmp/vela-evidence/0.3.12/a09/m2-f1/`，ignored，不新增 tracked summary 或大型 evidence 目录。主报告本轮追加 **11690 bytes**、现为 **184345 bytes**；Git 已跟踪 A09 evidence 合计 **205278 bytes**；本轮 local raw **114 files / 1348102 bytes**（含 inventory 自身大小，不声明自身 SHA）。正式 suite/harness 按授权保留为测试代码。没有暂存、commit、push、PR、merge、tag 或其他 Git 写操作。

停止于 **A09-M2-F1 IMPLEMENTED / OFFLINE PASS / REAL AE REVALIDATION PENDING**。这是对已定位自然误拒的实施修复，真实产品复验留待另轮正常重启/装载后执行；本轮不调用真实 TBB Create、不做 R2–R7/Undo、不操作原 R1 资产。M1 继续 **TARGETED_ACCEPTED — AE 26.0x67**，26.3 cross-version revalidation 继续 **DEFERRED**；**M2 和 A09 整体仍未 TARGETED_ACCEPTED**，不进入其他 0.3.12 项。

## A09-M2-F1 — targeted real AE revalidation（AE 26.0x67，2026-09-12）

**A09-M2 TARGETED_ACCEPTED — AE26.0x67。A09 TARGETED_ACCEPTED — AE26.0x67。** F1 本轮真实产品复验七组全部 PASS，按 R1 → R7 → R2 → R3 → R4 → R5 → R6 执行，共 **7 次真实 registry Create（6 次成功、1 次预期安全拒绝）**；六次成功动作均取得用户画面确认和一次原生 Undo，合计 **3451 个所查字段，0 差异**。这是 AE26.0x67 的有界 targeted acceptance；M1 既有接受范围保持，**AE26.3x87 CROSS-VERSION REVALIDATION DEFERRED**，INTEGRATED_ACCEPTED / CLOSED 仍留待 0.3.12-G，不自动进入下一项。

本轮只做实机复验和文档收束，生产/正式测试未改，未运行 70/352、162/906、192 suites 或任何其他 offline suite。F1 实施轮的 192/192 PASS 与原 M2 的 191/191 是各自历史事实；原 M2 R1 FAIL、唯一误拒 callback 与 **2555 字段零差异**、F1 诊断/修复日志，以及旧 M1/toComp、M1b V1 几何 FAIL 均保留，不删除或重写。

### 正常装载与唯一能力 smoke

用户明确回复“已重启并打开测试工程，面板就绪”。本轮进程 **PID 55280**，启动时间 `2026-09-12T22:02:20.6278237+08:00`；Host `app.version=26.0x67`、build 67，工程为 `E:\Project EX\Project Vela Navis\Vela Test.aep`。每次 Host 调用都从 `.debug` 的 AEFT 8088 重新发现当前 CEP target，经真实 `CSInterface.evalScript`；不复用旧 M2 target/闭包，不加载测试副本。

实际 Host 读取的 [TBB 模块](../../host/tools/textBackgroundBox.jsx) binary bytes 与当前 Extensions 工作树完全一致，SHA-256 **`a2e00da70cb92191f58f2b28f48613fc10933f88f20bbc997c807adb22606152`**。公开 `create.toString()` 与当前源码经空白规范化后匹配；catalog valid、last load succeeded、`loadErrors=[]`，真实注册仍为 `textBackgroundBox/create → AEToolbox.tools.textBackgroundBox.create`。**文件一致、正常装载、公开函数匹配与下述产品行为是分开的证据；公开函数不构成全部私有闭包的逐字证明。** 未导出或覆盖 sameIdentity，也无 monkey-patch。

原 R1 source 上只判定一次中心点能力 smoke：`typeof sourcePointToComp="function"`、`typeof toComp="undefined"`；合法 local center `[129.70703125,-14.31640625]` 返回二维 finite `[494.789855957031,245.915237426758]`，独立 A/P/S/R 预期 `[494.78984375,245.915234375]`，最大误差 **0.000012207031034**，小于固定 **1e-4 AE unit**。后续 B0/B1 四角和 parent inverse 是各组产品几何证据，没有重跑 A0 matrix 或 F1 纯逻辑 probe。

### 统一判据与实际七组结果

每组动作前冻结 B0、参数、比较域和独立 expected；准备动作与产品 Create 分开。所有动作仅调用一次 `AEToolbox.runRegisteredToolAction("textBackgroundBox","create",paramsJson)`，raw callback 先落盘再解析。参数沿用实际 schema 与上一轮记录：paddingX/Y **24/12**、cornerRadius **15**、Solid Fill **#D6B25E / 100**、enableStroke=false，其余字段保持原记录；default 按生产契约强制 padding 0、Roundness 15。

Text 真值是 **B0 source-local rect 加 local padding，再由独立 affine source/parent 链转换成 comp AABB**；Shape/AV 是 **source comp AABB 加 comp padding**；default 单独按 100×100、comp 中心。实际检查 expression-evaluated Rect Size/Position、group/layer Transform、最终 parent、真实 background sourcePointToComp 四角，并以 evaluated rect 经独立 group/layer/parent 几何重算作交叉核对。所有六个最终 AABB 的 left/top/right/bottom/width/height 最大误差 **0.000018885764120568638**，没有只检查 pre-expression Size。保持矩形几何/AABB 口径，不将圆角像素、描边或 alpha/effect 轮廓混入判据；容差未放宽。

| 组 | 真实代表 | 唯一 Create | 最终 AABB 最大绝对误差 | 画面 / Undo 或零变更证据 | 结果 |
| --- | --- | --- | --- | --- | --- |
| R1 | 原 comp 288 / layer 300，无 parent Text，Scale 140/90、Rotation 0 | `ok:true/count:1` | 0.000018310547 | 用户画面确认；一次原生 Undo；B0/B2 323 字段 / 0 差异 | PASS |
| R7 | 无选择 default，严格 null parent，100×100 / comp center | `ok:true/count:1` | 0.0000000 | 用户画面确认；一次原生 Undo；B0/B2 9 字段 / 0 差异 | PASS |
| R2 | 单层 translation-only Null parent；child Scale 133/133、Rotation 8° | `ok:true/count:1` | 0.000018885764 | 用户画面确认；一次原生 Undo；B0/B2 631 字段 / 0 差异 | PASS |
| R3 | 单层 translation-only Text parent；child Scale 133/133、Rotation 8° | `ok:true/count:1` | 0.000018885764 | 用户画面确认；一次原生 Undo；B0/B2 639 字段 / 0 差异 | PASS |
| R4 | canonical 2D rectangle Shape，单 identity group / Fill | `ok:true/count:1` | 0.0000000 | 用户画面确认；一次原生 Undo；B0/B2 1534 字段 / 0 差异 | PASS |
| R5 | 64×32 PNG / FootageItem，Scale 100、Rotation 0 | `ok:true/count:1` | 0.0000000 | 用户画面确认；一次原生 Undo；B0/B2 315 字段 / 0 差异 | PASS |
| R6 | selected 顺序先合法 Text、后真实 3D Text，selection-wide preflight | `ok:false/count:0`，自然支持边界拒绝 | 不适用 | B0/B1 594 字段 / 0 差异；无 Undo | PASS |

六个成功组各新增且仅新增一个 background；最终 parent 为对应 source 的 compId/layerId，default 严格 null。四条工具表达式（Rect Size、Roundness、Fill Color、Fill Opacity）均启用且无 error，五个控件名称/值正常；identity group Transform、有限 Rect/Transform/四角、source 与 external parent 用户数据保持均通过。所有动作前后 comp.time 都是 **0.5 秒**，requested measurement time 等于当前 comp.time。B0/B2 使用严格值相等，不使用几何 epsilon 作为 Undo 宽容差；比较保留 comp/time、层身份及顺序、parent、Text/sourceRect、Transform、comment、表达式/keys、相关 Shape/Effects。selection/viewer focus 在动作前明确排除；Create 导致的 index 位移与 identity 分开，Undo 后原顺序恢复。

### R1 原失败资产与视觉判读

原 `A09_M2_R1_TEXT_26_0` / source id300 在重新取得真实对象后，确认 comp id288、time0.5、Anchor `[12,18,0]`、Position `[330,275,0]`、Scale `[140,90,100]`、Rotation0、严格 null parent、Text `R1 Coordinate`、原 sourceRect 全部一致；未重建/替换或修改其文本、parent、Transform/表达式。重启后的初次读取没有选择，故单独记录仅打开 viewer/选择该既有 source 的准备，再采 definitive B0；没有产品重试。

本轮唯一 Create 不再出现旧 identity/parent 误拒，最终 comp AABB 实测 L/T/R/B 为 `284.002349853516 / 221.791015625 / 705.577331542969 / 270.039459228516`，W/H 为 `421.574981689453 / 48.248443603516`；冻结目标仍为 `284.00234375 / 221.791015625 / 705.57734375 / 270.039453125`，W/H `421.575 / 48.2484375`。

用户曾询问“背景有不等比缩放算正常吗”。按既有 TBB **Text-local padding** 契约说明：source Scale140/90 会使背景及圆角随之不等比缩放，local padding24/12 对应 comp 左右33.6、上下10.8；这不是将 TBB 改成 M1 Feature 的 comp-space padding。随后用户明确回复“R1 包裹正常，已 Undo 一次”，B2 严格恢复 B0。原历史失败及其零变更证据不被本次成功覆盖。

R1 初次本地 B1 analyzer 将 Effect 的 **15 个 descendants**误计为“5 个控件”；raw 实际为五个控制参数加十个 AE 内置 compositing/GPU descendants。仅修正 ignored analyzer 的 direct-parameter 计数，并核对名称/值；原分析文件保留，同一 B1 重新分析通过，**没有新增 Host 调用、产品重试、阈值变化或 raw 覆盖**。该采集器计数问题不被记录成产品 failure，也未隐藏。

### R2 / R3 parent-space 与 visual 路径

R2 comp315/source329/Null parent328，R3 comp331/source344/Text parent343。parent 均为单层普通2D、静态，Anchor `[11,17,0]`、Position `[95,75,0]`、Scale100、Rotation0，无更深 parent；child Anchor `[12,18,0]`、Position `[260,210,0]`、Scale133/133、Rotation8°。各组 B0 对实际 source.parent 调用 compPointToSource：实际 source center comp 点 `[334.464080810547,228.266876220703]`，实际 inverse `[250.464080810547,170.266876220703]`；独立全链预期的初始 parent-space Position 为 `[250.464087959718,170.266880690064]`，误差不超过 **0.000007149171**。

已审阅的生产顺序是先得到 source comp center / external-parent inverse，再以 setParentWithJump 建立初始 parent，写初始 targetPosition，最后 `background.parent=source` 并读回标量 identity。本轮没有 setter 插桩或产品中间回调，**以上初始目标是独立预期及独立 API probe，不冒充实际中间写入 trace**。实际 B1 最终 background Position 约为 `[0.74218170931559,-10.585940079619,0]`，已处于 **source layer space**，不能拿它直接和 external-parent 初始目标比较。最终 source parent 身份、geometry、原 source/external parent 所查字段均正常。

R4 canonical Shape 的 source comp AABB 为 `[293,197,473,277]`，最终 background 为 `[269,185,497,289]`（228×104）。R5 使用真正 PNG FootageItem，sourceRect 自然返回 `[0,0,64,32]`，source comp AABB `[348,252,412,284]`，最终 `[324,240,436,296]`（112×56），均零几何误差。没有用 precomp 替代，也没有修改 API 制造 fallback；**AV fallback REAL AE NOT COVERED** 保持。

### R6 安全拒绝、接受边界与留存

R6 在独立 comp 375 中记录实际 selectedLayers 顺序：合法普通 Text 在前、自然 unsupported 的真实 3D Text 在后。唯一 Create 原始结果为 `ok:false/count:0`，原因全文：**TBB preflight: Error: TBB_UNSUPPORTED_COORDINATE_ENVELOPE: An unlocked ordinary 2D layer in this comp is required.**。这是具体普通2D支持边界的预检拒绝，不是 identity 误拒碰巧阻断。合法第一项也未提前创建 background，B0/B1 **594 字段零差异**、layer count/time 不变；没有 Undo，避免撤销准备动作。未制造缺 API、异常 setter、非法 ID、NaN 或 drift。

接受范围保持既有 M1/M2 限定：普通静态2D Text，正 Scale，非均匀 Scale + 非零 Rotation 组合仍不放行；Text 的单层静态 translation-only Null/Text parent；canonical identity rectangle-group Shape、普通静态 FootageItem 的 Scale100/Rotation0 visual 代表；无选择 default。没有扩大至3D、任意 parent rotation/scale chain、嵌套/复杂 Shape、precomp/collapse、Transform drivers 或像素轮廓。TBB 当前坐标修复（含 F1）在上述 AE26.0x67 包络内真实验收通过，历史 CONFIRMED/UNFIXED 与各次 FAIL 保留其历史归属；26.3 兼容证据债务及 AV fallback 未覆盖不被写成 PASS。

收尾仅执行新增 evidence JSON parsing、Markdown 本地链接、format、`git diff --check`、i18n freshness、project consistency 及必要 hash/scope 核对，全部 PASS；**offline suites 实际运行 0 次**。本轮起点 602 个 non-ignored 文件中只有主报告追加，其余 601 个保持原 hash，未新增 non-ignored 文件；F1 冻结 246 个 Host/测试文件逐个一致，原 M2 实机失败与 F1 诊断实施目录的 193 个历史文件也保持原字节。完整 raw、36 次 Host 命令/target、callback、B0/B1/B2、独立几何/parent 空间比较、六组用户画面和 Undo 确认、临时夹具及 hash inventory 位于 `.tmp/vela-evidence/0.3.12/a09/m2-f1-real-ae-26.0/`，ignored；本轮未为每次读取导出整层完整 Property 树，只采固定的 Transform、TextDocument、相关 Shape/Effects 及必要身份/几何字段。主报告新增 **12260 bytes**，现为 **196605 bytes**；Git 已跟踪 A09 evidence 合计 **217538 bytes**；本轮 local evidence **440 files / 3891052 bytes**（含 inventory 自身大小，不声明自身 SHA）。没有新增 tracked summary 或大型 tracked evidence 目录，没有 Git 写操作。

停止于 **A09-M2 TARGETED_ACCEPTED — AE26.0x67 / A09 TARGETED_ACCEPTED — AE26.0x67**；不进入下一项，不 commit/push/PR/merge/tag。
