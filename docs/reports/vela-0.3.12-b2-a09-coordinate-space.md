# 0.3.12-B2 / A09 — Host Coordinate Space Production Reconciliation

## 当前状态（2026-09-11）

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
