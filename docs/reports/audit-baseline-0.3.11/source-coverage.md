# 审计覆盖与明确缺口

基线：`b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`。审计日期：2026-09-08。

**不能将本轮标为全仓所有源码审计完成。** 远程逐文件读取可用，但完整源码归档没有取得，无法在本地针对全部文件执行自动扫描或仓库测试。以下记录实际检查的方向，而非逐文件全量 PASS 或漏洞不存在证明。没有编造代码行覆盖率、文件覆盖百分比或完整源码文件总数。

## 设计依据

已对照：`AGENTS.md`、`README.md`、`docs/PROJECT_STATE.md`、`docs/VELA_ROADMAP.md`、`docs/KNOWN_ISSUES.md`、冻结架构的执行红线、Session/Authority/Observation 契约，以及 0.3.11 A4/A5/集成验收报告。上轮与本轮均锁定同一提交；上轮已报告的问题不计为本轮新增缺陷。

## 检查较深入的模块或函数链

| 范围 | 本轮/相同基线前轮的实际检查 | 不代表什么 |
| --- | --- | --- |
| Conversation | Ownership、Composition、Switcher 的对象身份、source port、admission、dispose、切换和草稿路径 | 不代表所有原生窗口/应用关闭场景已实测 |
| Agent / Session | AgentRuntime、AgentDriver、SessionRuntime 的事件追加/订阅、Review continuation、Verify、terminal、cancel；Owner 的轨迹投影 | Owner 所有路径未逐行检查；没有实际完整 Driver/Host 集成重跑 |
| Surface | SurfaceController 的配置/启停/挂起、TranscriptView 的流式布局与滚动；main 的设置分派和 selected Surface 重建 | main、CoreUI 和全部 CSS 未逐行完成；没有真实浏览器几何验收 |
| Provider | LocalTransport、StreamAssembler、Adapter 的 terminal 合成/finish_reason、请求分支与 Intent Gate、reasoning/presentation 边界 | 大型 Adapter/Controller 的全部分支未逐行完成；没有真实 Provider 对抗测试 |
| Execution / Authority | ExecutionAdapter、Host Execution、Guard、EvidenceResolver、DelegationPolicyEngine；Runtime 与 ContextBridge 的两条 Verify 路径 | PlanStore、Preflight、GrantStore、所有 authority producer/coordinator 尚未逐文件完成 |
| Capability | 两套 registry/contract、参数验证、LogicalPlanContracts、请求分类与 Intent Gate 的专用化边界 | 全部 Compiler/PromptBuilder 等实现未逐行完成；泛化不是现阶段已交付能力 |
| 普通 Host | host/index 的公共 JSON、Vela 私有 Host bootstrap、registry loader；aeUtils；Text Background Box 的创建/坐标路径；Ad Component Kit 的读取元数据、源注释保留/恢复、Detach、Remove、Refresh、Feature Stack、Grid 关键路径 | Ad Component Kit 的全部分支、Shape Add 和全部 tool schema/lab 还未完成逐文件审计 |
| Palette / 外观 | PaletteModel、PaletteStore 前半部、程序化引擎的种子/缓存/参数与配色入口、Palette Workspace 部分流程 | Palette/Appearance/Migration/Resolver 全链路未完成，不能给其全体通过结论 |
| Helper / 工程门禁 | Windows eyedropper helper、客户端装载清单、测试运行器与 CI 定义 | 没有本地 PowerShell/WinForms/AE 测试；没有逐条审查 182 个测试 suite |

## 明确未完成的工作面

1. `client/js/main.js`、`client/js/ui/`、全量 CSS、完整 Settings/DesignTuning/Appearance 及非 Vela UI 事件生命周期。
2. Palette Resolver、Derivation、Migration、Editor、Store/Workspace/Procedural Home 的完整联动；当前仅局部读取。
3. 所有 Vela 辅助源码逐文件覆盖，特别是完整 Protocol/Parser/Compiler/PlanStore/Preflight、GrantStore/Authority coordinator/producer、ProviderController、Observation 与 Owner 剩余路径。
4. `host/vela/velaContext.jsx`、`host/vela/velaJson.jsx` 全文检查；所有 Shape Add、Registry 工具定义与 lab 全文检查。
5. 全部测试、夹具、开发脚本的测试正确性/缺口审计，以及所有源文件的自动静态扫描。
6. 真实 AE：条件性无原生 JSON 分支、提交后切目标、no-op 的 canonical Session 记录、后台 Review 停用、readiness 挂起、源注释 Detach、2D/父级/旋转/表达式坐标矩阵和实际滚动行为。

## 已执行的本地工作

三份源码摘录/受控夹具脚本，17 个检查场景。包含 3 个明确标注的跨层行为模型；它们不替代完整生产对象接线或实机证据。所有结果在相应 JSON 文件中保留。

## 结论用语

允许：某函数在明确夹具下有某表现；某实际源码调用链缺失某校验；某风险依赖明确环境条件；某问题未在实机复现。

不允许：全仓无漏洞；所有源码已逐行检查；17 个新安全漏洞；本轮全量离线回归通过；AE 已复现或已修复；所有未来功能未实现都属于当前缺陷。
