# 覆盖与未覆盖

## 已深入读到的实际源码

- VelaComposerView（完整；本地源与 Git blob 一致）。
- VelaConfirmationView（完整；本地源与 Git blob 一致）。
- VelaConversationSwitcher、VelaConversationOwnership、VelaSurface、VelaAgentSurfaceProjection（完整读取）。
- VelaSurfaceController 的 action/状态/订阅前半部分；后半部分参考当前对话已取回源码。
- VelaPresentationModel 的 terminal/confirmation 处理；其他部分参考当前对话已取回源码。
- velaSurface.css（完整读取；测试只使用明示 selector 摘录）。
- client/index.html（完整读取）。
- system/systemSurfaceRouter.js（完整读取）。
- main.js 的 Vela/Settings 打开关闭、全局 Escape、Palette wrapper、SystemRouter 接线等局部。
- proceduralPaletteWorkspace.js 的 request/dirty/save/close/reset/公开 API 等局部。
- CoreUI 的 Select 行为局部；未将完整 CoreUI 作为本地测试模块。
- i18n 的 Vela/Palette 相关区段；DESIGN_SYSTEM 中的当前 release authority 与现有 UI 契约。

## 实际运行

`probes/run-browser-probes.py` 的 UXP01–UXP10，共 10 个局部场景（含正向对照）。
本地两个 module 文件分别校验远程 Git blob；翻译、DOM、样式依赖和 Escape 下游为显式夹具。
结果保存为 browser-results.json。

## 未覆盖

- 完整应用加载、全部 CSS 级联、原生 CEP/AE 运行；真实平台字体与对比度验收。
- 完整的 Home 重排、Morph 动效、Registry 每个控件、Palette 所有编辑与导入导出流程。
- Windows/macOS IME、屏幕阅读器、系统缩放/跨屏 DPR 与真实 AE 焦点互操作。
- 模态全程 Tab containment、portal 所有权与宿主快捷键穿透的综合实测。
- 完整 Agent 多步运行与实际 Review/Host 提交，不应将静态 UI 文案判定当成这类集成结果。
- 原生进程退出不能可靠询问用户的行为没有被重新定义。

此报告不是全量 UI/UX PASS，也不是用户研究或审美打分。
