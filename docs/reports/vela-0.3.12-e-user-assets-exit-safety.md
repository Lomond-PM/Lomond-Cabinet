# 0.3.12-E — User Assets & Exit Safety

当前：**E TARGETED_ACCEPTED / READY FOR COMMIT / PR — AdobeCEP 12.0.1 / Chrome 99 / Windows Win64**。AP-01、AP-02、AP-03、UX-01、UX-02 分别 TARGETED_ACCEPTED，证据限定如下。分支 `fix/user-assets-exit-safety-0.3.12`，基线 `dev@c80ef96324cc5fbff2780f8988b01f4760e7e3e4`。D 已通过 PR #210 合并，其有界接受和欠项保留在 [D 报告](vela-0.3.12-d-provider-task-lifecycle.md)。范围来自[指导书 AP-01–03、UX-01–02](../design/vela-0.3-reconstruction-guidance.md)。不进入 F；INTEGRATED_ACCEPTED / CLOSED 留待 G。

详细脚本、失败记录、实际回调和有限 UI trace 仅存本机 `.tmp/vela-evidence/0.3.12/e-user-assets-exit-safety/`。未改 Host、Provider/Authority/Session 实现、Palette schema、固定配色/生成算法、包版本或冻结架构。

## 五项结论

| ID | 实际生产反例与修复 | 验收 |
|---|---|---|
| AP-01 | 原 Palette commit 在 getItem 抛错后执行 removeItem，旧资产被删除。现在先可靠读取旧值，再尝试写入；仅在读回确认为本次写入时恢复可靠旧值，分别返回读/写/恢复事实及双失败错误。 | 离线旧值存在/不存在、读失败、写前/写后失败、恢复失败、正常保存；CEP 页面生产 Store＋隔离存储读失败无写无删 PASS。 |
| AP-02 | 原 Appearance 无 storage 报 persisted=true，两个 Resolver 忽略 save 失败。Store→Resolver 显式传递 accepted/applied/persisted；实际 CoreUI 消费者提供未保存提示、重试、还原，main 禁止未保存错误状态离开。Workspace 只接受 persisted=true；保存后先更新投影再通知外层。 | 离线及真实 CEP 隔离组合：失败、dirty 保留、重试、reset 失败、可靠还原、无可靠基线均 PASS；真实 UI 正常保存与原生持久读回 PASS。 |
| AP-03 | 原 Appearance getOverride/getOverrides/ResolvedValue 泄漏 colorAlpha，默认嵌套对象未冻结。合法输入按原 schema 规范化，读出深复制，嵌套默认值冻结；Design Tuning evidence 不再暴露 canonical 嵌套引用。 | 输入可继续修改而不污染 Store，读结果/默认值/跨实例隔离，现有合法格式与迁移回归 PASS。 |
| UX-01 | 原菜单仅 preventDefault，main 无视消费状态；活动图形拖动的 document 键盘监听晚于外层。main 尊重消费、先结束 picker/menu；菜单只消费已打开状态，活动拖动在 capture 阶段处理。 | 真实 UI 下拉菜单单次 Escape 只关闭菜单，下一次才进入 dirty 协商；CEP 临时生产 Bezier 的事件在离开内层前已消费，离线编辑/控件回归 PASS。 |
| UX-02 | 原 Router 先改 active，外层 Settings 关闭直接丢草稿。现在 requestLeave 完成前不改 route/active；同一 pending 请求不重叠，ticket/token 拒绝过期回调。强制 teardown 单独清理，不等待协商。 | 生产 Router＋Workspace 的返回/关闭/替换、保存失败、继续编辑、重复请求、迟到按钮/dispose PASS；真实 UI 内部返回、背景关闭、Escape 的保存/丢弃/继续编辑 PASS。 |

## 最终契约与兼容边界

- `accepted` 表示参数/状态变更被接纳；`applied` 表示当前内存/外观投影已应用；`persisted` 只来自实际存储成功。Design Tuning 延迟投影期间可 persisted=true、applied=false。基础 Settings 的保存 owner 仍为 main；Resolver 的 `persistenceOwner: settings` 不冒充保存收据，main 在原保存步骤后回填真实结果。
- Store 读取失败或旧格式不可可靠读取时，不写默认数据、不删除旧键。Palette transaction 区分 oldValueReadSucceeded、previousExists、writeAttempted、writeSucceeded（含 null）、rollbackAttempted、rollbackSucceeded。无法确认本次写入或观察到其他值时不冒险回滚，不宣称恢复成功。
- Appearance/Design Tuning 可保留未保存的已应用值；失败不清 dirty，重试走原 save，还原重新读取可靠保存值；不可读取时拒绝还原。reset 使用同一保存契约。合法输入继续遵循各自 registry；没有移植 Session payload 限制或冻结调用方对象。
- 保存仍是现有同步存储契约，没有引入异步持久化。Workspace 校验提交时的 editorState 身份，保存成功先刷新再释放 leave；Router 的用户协商回调可延后，重复离开不会覆盖原请求，取消保留原实例/草稿/滚动容器。
- `ProceduralPaletteStore.create()` 和 `ProceduralPaletteWorkspace.create()` 提供普通独立实例；默认页面单例保留。依赖由构造/initialize 传入，未覆盖 live localStorage、Storage.prototype、全局模块或 Host 函数。

## 实际离开入口

| 入口 | 当前接线与证据 |
|---|---|
| Palette 内部返回 / Settings 顶部返回按钮 | requestSettingsBack → Workspace.requestBack → 现有保存/丢弃/继续编辑；真实 UI 已测 |
| Settings 背景点击 | requestCloseSettings → Router.close → beforeLeave → Workspace.requestLeave；真实 UI 已测 |
| Escape | CoreUI 内层消费后 main 停止；未消费时进入上述外层 gate；真实 UI 已测 |
| Router navigate/open 替换当前页 | 同一 beforeLeave，批准后才更换 active 和关闭旧 Workspace；离线/生产组合覆盖，未宣称每个路由都有独立真实 UI 按钮 |
| 初始化/强制面板卸载 | 初始化 ensureClosedState、teardown 清理，不请求用户协商；renderSettingsContent 当前仅在启动 bindEvents 中调用，不是普通导航的替代销毁路径 |

## 验证与证据等级

- 新增 `test-user-assets-exit-safety.js`：**190 assertions PASS**；复用真实模块与既有 DOM fixture，故障只在 storage 边界。关联范围覆盖 Palette/Appearance/Design Tuning/CoreUI/Settings/Router，以及 C1/C2/D 的现有回归。
- 首次全量 **191/196，0 skip**：旧结果形状断言、缺 stopPropagation 的事件夹具及 i18n 报告过期；日志保留。保存后投影修正后的中间版本 **196/196** 保留历史归属。最后共享反馈/Settings 收据接线后另一次 **195/196** 的旧源码断言失败也保留，修正为检查 accepted 与实际保存结果，未删除负向测试。
- 最终全量：**196 discovered / 196 executed / 196 PASS / 0 FAIL / 0 skip**，对应最终生产/正式测试代码，日志 `full-final.log`。23 个变更 JS 的语法、i18n freshness、project consistency、6 份文档的 80 个本地链接、证据 JSON 解析及 diff 格式检查 PASS。
- 实际环境：**AE 26.0（CEP 环境接口）/ AdobeCEP 12.0.1 / Chrome 99.0.4844.84 / Windows Win64**。从 DevTools 获取 11 个实际加载生产脚本并与工作树核对；main 仅有加载器 BOM 差异，规范化源码相同。没有 require/eval 第二份生产模块。
- 真实 CEP 受控组合：Store/Resolver/Workspace **26 项检查 PASS**；Store→Resolver→实际 CoreUI 提示/Retry/Restore 四项 PASS；临时 Bezier Escape 顺序 PASS。故障并非自然发生在用户存储，不升级为自然故障实测。
- 真实 UI/原生正常存储：使用唯一临时 Palette `userPalette_mtzowzo2`，输入由 CEP Input 键盘/鼠标事件触发；内部保存后重新打开，并从 localStorage JSON 独立读回同一 ID；内部与外层继续编辑、保存、丢弃及重复关闭均通过。未用内存快照代替持久读回；没有测试任意异步 storage 协议。
- CEP 首次“取消”检查是采集器误选两个同名按钮中的另一项，保留原结果后限定到协商操作栏。随后真实发现“保存成功但外层保留页面时 dirty 投影未刷新”，补回归并修复，最终复验通过。离线补反例曾因深 DOM 失败输出构造过大而终止采集进程，已改为标量断言；真实 CEP 失败读数保留，不作为产品 PASS。

## 清理与限制

临时 Palette 通过正常 UI 删除确认按记录 ID 清理；原 custom Palettes、built-in overrides、隐藏记录、映射及迁移数据均不变，仅该容器的 updatedAt 因正常测试保存/删除更新。其余五个相关存储键原字节不变；未恢复整份旧快照覆盖存储。Settings 导航后通过正常 Appearance resolve 恢复原有外观投影，root style 参数逐项一致。

临时 Workspace 已 teardown/退订，临时 DOM、菜单、RAF/resize/transition 观测为零；未留下断点或测试全局引用。默认页面自己的 Store 订阅保留。Provider 随获准重载保持禁用，未发 Provider 请求、Grant、Host mutation 或执行 AE Undo；没有重启 AE。D 自然在途/生命周期 UI 欠项及原 PROVIDER_TIMEOUT 不由 E 解释或豁免。

提交范围为 11 个生产 JS、12 个正式 suite/fixture 文件和 6 份文档（含生成的 i18n 报告）。新增仅本报告及正式 `test-user-assets-exit-safety.js`；完整 raw 继续 ignored。未暂存或执行提交、推送、PR、合并、tag。
