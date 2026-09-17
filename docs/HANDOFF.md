# Development Handoff

**0.3.12 — Baseline Safety & Fact-chain Closure：COMPLETE / SEALED。** 最终 G 综合验收已通过 PR #213 合并到 `dev@ce8a73646cb01859d0f258101bee39f547081615`，对应 Project checks 成功；最终离线基线为 **198/198 PASS，0 FAIL，0 skip**。20 项原缺陷/治理条目按有界证据 CLOSED，G-10 / COV-03～06 五个持续覆盖工作面保持 OPEN，其余 29 项沿后续路线；D/F 历史 `PROVIDER_TIMEOUT` 原 FAIL、原因与 token 统计 unknown 保留，残余可用性风险按 G 裁定接受，继续保持 Experimental Preview、默认禁用、readiness≠qualification 与现有 120000 ms 整个请求截止。完整证据与限制见 [0.3.12 G 综合报告](reports/vela-0.3.12-integrated-acceptance.md)。

**当前发行身份：`0.3.12 — Legacy`。** `VERSION`、manifest 与 Host `projectVersion` 均应保持 `0.3.12`。GitHub 上不可变的 `v0.3.12` tag / Release 是“是否已经发布”的权威事实；维护中的仓库文档不再复制一个短暂的 published/unpublished 布尔状态，因此 release-prep 合并后无需仅为“发布完成”再改一轮 current docs。Legacy 表示 0.3.13/0.3.14 大型 UI 重构前的固定产品基线，不等于 Vela 已完成模型资格或长期维护承诺。

**下一开发里程碑：0.3.13 — Visual Baseline & UI Platform Rebuild。** 现有 UI Lab 的基础视觉方向已经获得用户认可，不重新发散一套审美；0.3.13 从真实页面/生效样式审计开始，把 UI Lab 的布局、排版、组件与 motion contract 对照生产页面并重建共享平台。Liquid Glass 仍是 UI Lab 中的独立材质探索层，继续研究 capability-gated / graceful fallback，不作为样式平台重建或非玻璃页面工作的前置门。0.3.14 再负责 Home、Registry、Settings、Palette、Vela 的全产品迁移和旧路径退出。

当前排期见 [VELA_ROADMAP](VELA_ROADMAP.md)，当前实现事实见 [PROJECT_STATE](PROJECT_STATE.md)，Agent normative 边界继续由 [frozen architecture](design/vela-agent-architecture.md) 持有。
