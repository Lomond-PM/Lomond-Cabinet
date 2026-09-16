# A08-H0 — Evidence Retention Cleanup

日期：2026-09-11。A08（含F1/F1a/F1b）继续为 **TARGETED_ACCEPTED / READY FOR COMMIT / PR**。本记录只描述留存整理；[主A08报告](vela-0.3.12-b2-a08-detach-comment-ownership.md)继续持有完整阶段事实，[最终验收摘要](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)保留原裁定。未重新验收、未执行产品测试/AE/Provider或Git写操作。

## 基线与统计口径

实际分支 `fix/ad-component-detach-a08-0.3.12`；HEAD、dev、origin/dev及merge-base均为 `d7dd7356cccbb637ae01a7e9d0629b9bc184a388`。该HEAD仍是实施基线，不是尚未创建的修复提交。H0开始时既有8个已跟踪文件修改及未跟踪的A08证据/测试；无暂存。

先保存只读清单，再制定保留集和迁移。提交面＝`git diff dev --numstat` 的已跟踪差异＋`git ls-files --others --exclude-standard`的新增文件全文；字节为当前新增/修改文件的完整大小，不是净增长量。文本行按LF及末行计数，二进制不计行。目录按reports证据根聚合，其他路径按父目录聚合；证据JSON按实际response/records与派生记录分开。下表包括本H0记录自身。

| 范围 | 清理前文件 | 前 +行 | 前 -行 | 前 bytes | 清理后文件 | 后 +行 | 后 -行 | 后 bytes |
|---|---|---|---|---|---|---|---|---|
| 整个提交面 | 320 | 2,127,727 | 147 | 67,253,563 | 86 | 13,680 | 147 | 1,100,896 |
| docs/reports全部 | 309 | 2,126,377 | 102 | 66,889,752 | 75 | 12,330 | 102 | 737,085 |
| 八个A08证据目录 | 306 | 2,125,556 | 0 | 66,537,291 | 71 | 11,202 | 0 | 353,325 |

A08证据占提交面字节：98.93% → 32.09%；占新增行：99.90% → 81.89%。docs/reports全部（含正式报告/总账/生成报告）字节占比：99.46% → 66.95%。总体字节减少 98.36%，新增行减少 99.36%。

原 +lines 主要来自 F1b finalize-records（352,674行）、F1a focused（352,617行）、F1b after（262,503行）、F1b boundaries-development（221,865行）、F1 focused-final/focused（164,892/153,164行），以及D1完整raw/tree枚举。均是调查现场记录；生产差异仍为+412/-35行，实施测试仍为新增898行，本H0没有改变它们。

## 按材料类别

| 类别 | 前文件 | 前 +行 | 前 -行 | 前 bytes | 后文件 | 后 +行 | 后 -行 | 后 bytes |
|---|---|---|---|---|---|---|---|---|
| 生产代码 | 1 | 412 | 35 | 128,096 | 1 | 412 | 35 | 128,096 |
| 实施测试/fixture | 4 | 898 | 0 | 61,761 | 4 | 898 | 0 | 61,761 |
| 正式文档/机器总账 | 7 | 736 | 14 | 339,635 | 8 | 1,043 | 14 | 370,934 |
| 生成报告 | 1 | 98 | 98 | 185,042 | 1 | 98 | 98 | 185,042 |
| 原始证据JSON（Host回调或离线records） | 88 | 1,983,578 | 0 | 58,401,726 | 10 | 4,624 | 0 | 120,372 |
| 派生证据JSON/索引 | 109 | 136,190 | 0 | 4,616,675 | 61 | 6,578 | 0 | 232,953 |
| 日志/检查输出 | 26 | 4,096 | 0 | 253,345 | 0 | 0 | 0 | 0 |
| 截图 | 6 | 0 | 0 | 2,958,376 | 0 | 0 | 0 | 0 |
| 诊断命令/脚本 | 77 | 1,708 | 0 | 307,335 | 1 | 27 | 0 | 1,738 |
| 派生比较Markdown | 1 | 11 | 0 | 1,572 | 0 | 0 | 0 | 0 |

日志表只计提交可见文件；另有12份已被`*.log`忽略的F1b原日志，也一并本地归档。保留的`scripts/capture-a08-detach.js`属于已有实施采集脚本，字节未改。

## 按目录与扩展名

| 目录 | 前文件 | 前 +行 | 前 -行 | 前 bytes | 后文件 | 后 +行 | 后 -行 | 后 bytes |
|---|---|---|---|---|---|---|---|---|
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline` | 20 | 906,348 | 0 | 23,169,059 | 6 | 301 | 0 | 11,220 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae` | 44 | 235,918 | 0 | 11,015,581 | 8 | 1,492 | 0 | 57,353 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-offline` | 16 | 358,187 | 0 | 9,314,742 | 3 | 105 | 0 | 3,838 |
| `docs/reports/vela-0.3.12-b2-a08-f1-offline` | 16 | 319,528 | 0 | 8,281,142 | 1 | 32 | 0 | 1,539 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae` | 126 | 105,828 | 0 | 7,563,385 | 35 | 4,075 | 0 | 155,953 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae` | 54 | 116,459 | 0 | 4,153,081 | 10 | 636 | 0 | 37,465 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae` | 21 | 23,133 | 0 | 1,862,322 | 5 | 264 | 0 | 18,676 |
| `docs/reports/vela-0.3.12-b2-a08-offline` | 9 | 60,155 | 0 | 1,177,979 | 3 | 4,297 | 0 | 67,281 |
| `docs/reports/i18n-usage-report.md` | 1 | 98 | 98 | 185,042 | 1 | 98 | 98 | 185,042 |
| `host/tools` | 1 | 412 | 35 | 128,096 | 1 | 412 | 35 | 128,096 |
| `docs/design` | 1 | 4 | 2 | 112,745 | 1 | 4 | 2 | 112,745 |
| `docs/reports/vela-0.3.12-b2-a08-detach-comment-ownership.md` | 1 | 580 | 0 | 89,635 | 1 | 582 | 0 | 93,250 |
| `docs/reports/vela-0.3.11-consolidated-register.json` | 1 | 143 | 4 | 77,784 | 1 | 143 | 4 | 77,784 |
| `scripts` | 4 | 686 | 0 | 48,405 | 4 | 686 | 0 | 48,405 |
| `docs` | 3 | 8 | 7 | 44,005 | 3 | 8 | 7 | 44,005 |
| `.` | 1 | 1 | 1 | 15,466 | 1 | 1 | 1 | 15,466 |
| `scripts/fixtures` | 1 | 239 | 0 | 15,094 | 1 | 239 | 0 | 15,094 |
| `docs/reports/vela-0.3.12-b2-a08-evidence-retention.md` | 0 | 0 | 0 | 0 | 1 | 305 | 0 | 27,684 |

| 扩展名 | 前文件 | 前 +行 | 前 -行 | 前 bytes | 后文件 | 后 +行 | 后 -行 | 后 bytes |
|---|---|---|---|---|---|---|---|---|
| `.json` | 198 | 2,119,911 | 4 | 63,096,185 | 72 | 11,345 | 4 | 431,109 |
| `.png` | 6 | 0 | 0 | 2,958,376 | 0 | 0 | 0 | 0 |
| `.md` | 8 | 702 | 108 | 448,465 | 8 | 998 | 108 | 478,192 |
| `.txt` | 66 | 5,086 | 0 | 423,210 | 0 | 0 | 0 | 0 |
| `.jsx` | 14 | 672 | 35 | 175,636 | 1 | 412 | 35 | 128,096 |
| `.js` | 21 | 966 | 0 | 120,887 | 5 | 925 | 0 | 63,499 |
| `.cjs` | 6 | 354 | 0 | 28,499 | 0 | 0 | 0 | 0 |
| `.ps1` | 1 | 36 | 0 | 2,305 | 0 | 0 | 0 | 0 |

## A08各证据目录的实际磁盘材料

此表包含忽略日志；与上面的提交面严格区分。F1a real-ae包含D1子目录。迁移后docs/reports下只保留下列最小证据集。

| 证据目录 | 前文件 | 前文本行 | 前 bytes | 后文件 | 后文本行 | 后 bytes |
|---|---|---|---|---|---|---|
| `A08-f1b-offline` | 32 | 906,738 | 23,209,378 | 6 | 301 | 11,220 |
| `A08-f1a-real-ae` | 44 | 235,918 | 11,015,581 | 8 | 1,492 | 57,353 |
| `A08-f1a-offline` | 16 | 358,187 | 9,314,742 | 3 | 105 | 3,838 |
| `A08-f1-offline` | 16 | 319,528 | 8,281,142 | 1 | 32 | 1,539 |
| `A08-f1b-real-ae` | 126 | 105,828 | 7,563,385 | 35 | 4,075 | 155,953 |
| `A08-real-ae` | 54 | 116,459 | 4,153,081 | 10 | 636 | 37,465 |
| `A08-f1-real-ae` | 21 | 23,133 | 1,862,322 | 5 | 264 | 18,676 |
| `A08-offline` | 9 | 60,155 | 1,177,979 | 3 | 4,297 | 67,281 |

## 长期保留与可追溯性

保留69个既有文件位置（60份历史JSON字节不变、9个索引仅调整留存结构），新增D1最小提取和F1b日志结果提取，共71份证据JSON。另保留主A08报告并新增本H0记录。所有阶段的原索引、完整快照、日志和图片都有原字节本地副本。最终三次Detach raw回调、B3比较、用户Undo确认均保留原文件。

| 需要支撑的裁定 | 长期证据及边界 |
|---|---|
| 原comment丢失与修复 | 初始offline before/after原生产组合记录与index；完整harness/测试仍保留。 |
| 首次Feature失败 | feature-expression-failure的五条表达式错误、原动作回调、Undo确认及原阶段summary；保留Grid受干扰Undo与恢复说明。 |
| F1契约 | 主报告完整当前帧定稿契约、F1 offline index中的421/251、187/187历史结果。 |
| F1a类型误拒 | F1实机summary、实际flags回调与refusal比较；源Text实际拒绝、背景当时为后续同条件推断；harness-gap与F1a结果。 |
| D1身份根因 | D1 summary/comparison：610条路径仅原5个bindings；identity-minimal保留30组实际引用/locator/content对照以及5个完整locator，提取前核对A/B/C/D记录一致。不是新探针或引擎内部结论。 |
| F1b locator/release | offline summary、validation、scope-decision及原日志行提取。全量只运行一次187/188、唯一生成报告guard失败；生成脚本更新后guard单独46项PASS，未写成188/188。 |
| 最终3/3与Undo | 最终summary/index、三组summary、三次原动作回调、B1局部检查/空间方法、B2数值与时间对照、三次B3零差异比较和用户确认。完整世界快照本地归档，不声称保留了全工程可重放证据。 |

实际保留清单（每个链接均为版本控制交付候选文件；各index记录本目录保留文件哈希）：

- [A08-f1-offline/index.json](vela-0.3.12-b2-a08-f1-offline/index.json)
- [A08-f1-real-ae/feature-normal-detach-action.json](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-detach-action.json)
- [A08-f1-real-ae/feature-normal-refusal-comparison.json](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-comparison.json)
- [A08-f1-real-ae/feature-normal-refusal-flags.json](vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-flags.json)
- [A08-f1-real-ae/index.json](vela-0.3.12-b2-a08-f1-real-ae/index.json)
- [A08-f1-real-ae/summary.json](vela-0.3.12-b2-a08-f1-real-ae/summary.json)
- [A08-f1a-offline/harness-gap.json](vela-0.3.12-b2-a08-f1a-offline/harness-gap.json)
- [A08-f1a-offline/index.json](vela-0.3.12-b2-a08-f1a-offline/index.json)
- [A08-f1a-offline/summary.json](vela-0.3.12-b2-a08-f1a-offline/summary.json)
- [A08-f1a-real-ae/d1-property-identity/comparison.json](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/comparison.json)
- [A08-f1a-real-ae/d1-property-identity/identity-minimal.json](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/identity-minimal.json)
- [A08-f1a-real-ae/d1-property-identity/index.json](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/index.json)
- [A08-f1a-real-ae/d1-property-identity/summary.json](vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json)
- [A08-f1a-real-ae/index.json](vela-0.3.12-b2-a08-f1a-real-ae/index.json)
- [A08-f1a-real-ae/r1-detach-action.json](vela-0.3.12-b2-a08-f1a-real-ae/r1-detach-action.json)
- [A08-f1a-real-ae/r1-refusal-analysis.json](vela-0.3.12-b2-a08-f1a-real-ae/r1-refusal-analysis.json)
- [A08-f1a-real-ae/summary.json](vela-0.3.12-b2-a08-f1a-real-ae/summary.json)
- [A08-f1b-offline/full-validation-failed.json](vela-0.3.12-b2-a08-f1b-offline/full-validation-failed.json)
- [A08-f1b-offline/index.json](vela-0.3.12-b2-a08-f1b-offline/index.json)
- [A08-f1b-offline/outcome-extract.json](vela-0.3.12-b2-a08-f1b-offline/outcome-extract.json)
- [A08-f1b-offline/scope-decision.json](vela-0.3.12-b2-a08-f1b-offline/scope-decision.json)
- [A08-f1b-offline/summary.json](vela-0.3.12-b2-a08-f1b-offline/summary.json)
- [A08-f1b-offline/validation.json](vela-0.3.12-b2-a08-f1b-offline/validation.json)
- [A08-f1b-real-ae/close-preconditions.json](vela-0.3.12-b2-a08-f1b-real-ae/close-preconditions.json)
- [A08-f1b-real-ae/evidence-audit.json](vela-0.3.12-b2-a08-f1b-real-ae/evidence-audit.json)
- [A08-f1b-real-ae/index.json](vela-0.3.12-b2-a08-f1b-real-ae/index.json)
- [A08-f1b-real-ae/load-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/load-comparison.json)
- [A08-f1b-real-ae/r1-after-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-after-user-confirmation.json)
- [A08-f1b-real-ae/r1-b1-checks.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-checks.json)
- [A08-f1b-real-ae/r1-b1-screenshot-errors.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-screenshot-errors.json)
- [A08-f1b-real-ae/r1-b1-space.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-space.json)
- [A08-f1b-real-ae/r1-b2-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-b2-comparison.json)
- [A08-f1b-real-ae/r1-b3-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-b3-comparison.json)
- [A08-f1b-real-ae/r1-before-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-before-user-confirmation.json)
- [A08-f1b-real-ae/r1-detach-action.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-detach-action.json)
- [A08-f1b-real-ae/r1-summary.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-summary.json)
- [A08-f1b-real-ae/r1-undo-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r1-undo-user-confirmation.json)
- [A08-f1b-real-ae/r2-after-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-after-user-confirmation.json)
- [A08-f1b-real-ae/r2-b1-checks.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-b1-checks.json)
- [A08-f1b-real-ae/r2-b1-space.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-b1-space.json)
- [A08-f1b-real-ae/r2-b2-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-b2-comparison.json)
- [A08-f1b-real-ae/r2-b3-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-b3-comparison.json)
- [A08-f1b-real-ae/r2-before-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-before-user-confirmation.json)
- [A08-f1b-real-ae/r2-collection-error.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-collection-error.json)
- [A08-f1b-real-ae/r2-created-checks.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-created-checks.json)
- [A08-f1b-real-ae/r2-detach-action.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-detach-action.json)
- [A08-f1b-real-ae/r2-preparation-authorization.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-preparation-authorization.json)
- [A08-f1b-real-ae/r2-summary.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-summary.json)
- [A08-f1b-real-ae/r2-temporal-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-temporal-comparison.json)
- [A08-f1b-real-ae/r2-undo-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r2-undo-user-confirmation.json)
- [A08-f1b-real-ae/r3-b1-checks.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-b1-checks.json)
- [A08-f1b-real-ae/r3-b2-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-b2-comparison.json)
- [A08-f1b-real-ae/r3-b3-comparison.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-b3-comparison.json)
- [A08-f1b-real-ae/r3-detach-action.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-detach-action.json)
- [A08-f1b-real-ae/r3-reuse-checks.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-reuse-checks.json)
- [A08-f1b-real-ae/r3-summary.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-summary.json)
- [A08-f1b-real-ae/r3-undo-user-confirmation.json](vela-0.3.12-b2-a08-f1b-real-ae/r3-undo-user-confirmation.json)
- [A08-f1b-real-ae/summary.json](vela-0.3.12-b2-a08-f1b-real-ae/summary.json)
- [A08-offline/after.json](vela-0.3.12-b2-a08-offline/after.json)
- [A08-offline/before.json](vela-0.3.12-b2-a08-offline/before.json)
- [A08-offline/index.json](vela-0.3.12-b2-a08-offline/index.json)
- [A08-real-ae/feature-detach-action.json](vela-0.3.12-b2-a08-real-ae/feature-detach-action.json)
- [A08-real-ae/feature-expression-failure.json](vela-0.3.12-b2-a08-real-ae/feature-expression-failure.json)
- [A08-real-ae/feature-preparation-comparison.json](vela-0.3.12-b2-a08-real-ae/feature-preparation-comparison.json)
- [A08-real-ae/feature-undo-confirmed.json](vela-0.3.12-b2-a08-real-ae/feature-undo-confirmed.json)
- [A08-real-ae/grid-preparation-comparison.json](vela-0.3.12-b2-a08-real-ae/grid-preparation-comparison.json)
- [A08-real-ae/grid-r2-status.json](vela-0.3.12-b2-a08-real-ae/grid-r2-status.json)
- [A08-real-ae/grid-r2-undo-confirmed.json](vela-0.3.12-b2-a08-real-ae/grid-r2-undo-confirmed.json)
- [A08-real-ae/grid-undo-user-contamination.json](vela-0.3.12-b2-a08-real-ae/grid-undo-user-contamination.json)
- [A08-real-ae/index.json](vela-0.3.12-b2-a08-real-ae/index.json)
- [A08-real-ae/summary.json](vela-0.3.12-b2-a08-real-ae/summary.json)

## 本地归档与引用规则

249个文件已移出提交面，合计 66,230,833 bytes；其中237个原先Git可见，12个原先已忽略。另复制69个保留位置的原件后再调整索引，归档共318份原始证据、66,577,610 bytes，逐份SHA-256验证一致。主报告修改前原文、原始diff清单和迁移计划亦保存在归档中；未销毁唯一证据。

本地路径（仓库根相对）：`.tmp/vela-evidence/0.3.12/a08/h0-20260911/`。完整原始诊断保留在本地临时证据工作区，不属于版本控制交付。`manifest.json`记录每份原文件路径、bytes、SHA-256及copy/move；子路径继续沿用原`docs/reports/...`结构。已核实`git check-ignore -v`命中现有`.gitignore:26:*.tmp`，无需修改ignore规则。

归档类别：完整Property tree与610节点扫描、B0/B1/B2/B3全对象快照、重复before/after和离线逐例records、Console/CDP返回、哈希库存、完整日志/中间失败输出、重复采集命令/UI DOM、6张用户原始截图。小型关键失败回调、数值比较与确认保留；原始图片在本地，Git中的用户视觉确认仍是用户证词，不能冒充图片或Host读取。

主报告103处原始大文件链接已改为对应保留summary/index，标签明确“原件已本地归档”。除这103处链接和一段H0留存说明，主报告原文逐字保持。保留JSON中的原路径/命令/JSON pointer/历史哈希不重写，按同目录index.retention规则解析到保留集或本地原路径；archivedReferences列出已移走的直接文件引用。新clone不含本地原件，索引明确这一限制。原collection数量（例如最终126文件）及当时PENDING/FAIL状态是历史记录，不是H0当前状态。

无法继续安全缩减的内容：60份原始保留记录含三次真实回调、恢复原文/code units、归属/空间对照与用户确认等直接证据，不能只留一个PASS数字代替；初始before/after虽比汇总大，保留它们可审阅原comment丢失及真实模块组合来源。主报告保留完整阶段历史。其余完整原件已成功归档，无因唯一证据无法迁移的遗留大文件。

## 检查与未改变的裁定

H0检查：72份提交面JSON可解析；303个Markdown本地目标存在；62个索引条目哈希吻合；78个新增文件及已跟踪差异分别格式通过；归档318份原件、60份保留历史记录字节验证通过。生产/实施测试/冻结architecture/包版本和其他ID状态保持H0起点字节；Git index及HEAD未变。

执行检查：`node scripts/report-i18n-usage.js --check` PASS（报告已最新）；`node scripts/check-project-consistency.js` PASS；`git diff --check`以及每个新增文件的`git diff --no-index --check -- NUL <file>`。JSON、链接和哈希仅读取本地文件。H0检查脚本及完整结果保留在本地`.tmp/a08-h0/`，未新增另一套产品测试。

未重新运行932/1134/251 focused、run-all-tests或真实AE；未修改生产、实施测试、生成报告、冻结architecture、包metadata、指导书/总账或其他当前入口。三次历史Feature FAIL、D1 30/30 reference mismatch/610路径、F1/F1a/F1b实施结果、最终R1/R2/R3 3/3 PASS及三次Undo零差异全部保留。Detach注册/UI未交付；Remove损坏恢复资料下的宽松解码风险仍未解决；INTEGRATED_ACCEPTED / CLOSED留待0.3.12-G。当前保持 **TARGETED_ACCEPTED / READY FOR COMMIT / PR**，不进入A09。

## 最大50个新增/修改文件：清理前

路径均相对仓库根；清理前已归档文件仅列历史路径，不构造失效Markdown链接。

| 文件 | +行 | -行 | bytes |
|---|---|---|---|
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/finalize-records.json` | 352,674 | 0 | 9,159,161 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-offline/focused.json` | 352,617 | 0 | 9,157,936 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/after.json` | 262,503 | 0 | 6,724,439 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/boundaries-development.json` | 221,865 | 0 | 5,723,960 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/raw-property-identity.json` | 94,389 | 0 | 4,921,865 |
| `docs/reports/vela-0.3.12-b2-a08-f1-offline/focused-final-records.json` | 164,892 | 0 | 4,235,759 |
| `docs/reports/vela-0.3.12-b2-a08-f1-offline/focused-records.json` | 153,164 | 0 | 3,940,706 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/scanned-bindings.json` | 89,150 | 0 | 2,427,986 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/a08-records.json` | 56,336 | 0 | 1,083,199 |
| `docs/reports/vela-0.3.12-b2-a08-offline/focused-records.json` | 55,283 | 0 | 1,071,808 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/r1-b1-user.png` | binary | binary | 541,488 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b2-user.png` | binary | binary | 537,840 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-user.png` | binary | binary | 536,190 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/feature-normal-b1-user.png` | binary | binary | 484,704 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-original-before-preparation.json` | 9,751 | 0 | 474,851 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b1.json` | 9,751 | 0 | 474,645 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b3.json` | 9,751 | 0 | 474,645 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-b1.json` | 9,751 | 0 | 474,631 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-b3.json` | 9,751 | 0 | 474,631 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/grid-ui-user-opened.json` | 17,448 | 0 | 466,573 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-ui-before-create.json` | 17,321 | 0 | 463,079 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/grid-create-ui.json` | 17,083 | 0 | 456,824 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/grid-tool-opened.json` | 17,083 | 0 | 456,824 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-b2.json` | 8,786 | 0 | 447,521 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b2.json` | 8,796 | 0 | 439,260 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/after.json` | 8,921 | 0 | 439,013 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/before.json` | 8,921 | 0 | 439,013 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/r1-b1.json` | 8,919 | 0 | 438,893 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/r1-b2.json` | 8,919 | 0 | 438,893 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/feature-normal-b1.json` | 8,831 | 0 | 431,198 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/feature-normal-b2-after-refusal.json` | 8,831 | 0 | 431,198 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b1-user.png` | binary | binary | 430,666 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b2-user.png` | binary | binary | 427,488 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-b1.json` | 5,729 | 0 | 272,402 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-b3.json` | 5,729 | 0 | 272,402 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-created.json` | 5,729 | 0 | 272,402 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/environment.json` | 102 | 0 | 248,976 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/environment.json` | 100 | 0 | 248,856 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/ae01-environment.json` | 100 | 0 | 248,850 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/environment.json` | 106 | 0 | 248,729 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-b2.json` | 4,774 | 0 | 248,532 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/ae01-environment.json` | 100 | 0 | 245,207 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/integrity-after.json` | 4,300 | 0 | 201,430 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/integrity.json` | 4,088 | 0 | 190,669 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b1.json` | 3,826 | 0 | 189,211 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b3.json` | 3,826 | 0 | 189,211 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-created.json` | 3,785 | 0 | 187,014 |
| `docs/reports/i18n-usage-report.md` | 98 | 98 | 185,042 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-ui-open-controls.json` | 4,584 | 0 | 179,493 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-b0.json` | 3,762 | 0 | 179,328 |

## 最大50个新增/修改文件：清理后

| 文件 | +行 | -行 | bytes |
|---|---|---|---|
| `docs/reports/i18n-usage-report.md` | 98 | 98 | 185,042 |
| `host/tools/adComponentKit.jsx` | 412 | 35 | 128,096 |
| `docs/design/vela-0.3-reconstruction-guidance.md` | 4 | 2 | 112,745 |
| `docs/reports/vela-0.3.12-b2-a08-detach-comment-ownership.md` | 582 | 0 | 93,250 |
| `docs/reports/vela-0.3.11-consolidated-register.json` | 143 | 4 | 77,784 |
| `docs/reports/vela-0.3.12-b2-a08-offline/after.json` | 2,324 | 0 | 36,030 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/identity-minimal.json` | 1,058 | 0 | 28,540 |
| `docs/reports/vela-0.3.12-b2-a08-evidence-retention.md` | 305 | 0 | 27,684 |
| `docs/reports/vela-0.3.12-b2-a08-offline/before.json` | 1,875 | 0 | 27,083 |
| `scripts/test-ad-component-detach-locator.js` | 256 | 0 | 18,425 |
| `docs/PROJECT_STATE.md` | 2 | 2 | 18,230 |
| `scripts/test-ad-component-detach-finalize.js` | 202 | 0 | 17,280 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b2-comparison.json` | 557 | 0 | 15,751 |
| `docs/VELA_ROADMAP.md` | 4 | 3 | 15,616 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b2-comparison.json` | 557 | 0 | 15,594 |
| `AGENTS.md` | 1 | 1 | 15,466 |
| `scripts/fixtures/ad-component-detach-harness.js` | 239 | 0 | 15,094 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/load-comparison.json` | 90 | 0 | 14,399 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b1-checks.json` | 433 | 0 | 13,268 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-expression-failure.json` | 79 | 0 | 12,319 |
| `scripts/test-ad-component-detach.js` | 201 | 0 | 10,962 |
| `docs/HANDOFF.md` | 2 | 2 | 10,159 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/feature-detach-action.json` | 31 | 0 | 10,088 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-detach-action.json` | 35 | 0 | 9,163 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-checks.json` | 245 | 0 | 9,134 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/index.json` | 226 | 0 | 9,042 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-temporal-comparison.json` | 399 | 0 | 8,328 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-detach-action.json` | 35 | 0 | 8,145 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-detach-action.json` | 35 | 0 | 7,869 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/r1-detach-action.json` | 31 | 0 | 7,716 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/feature-normal-detach-action.json` | 31 | 0 | 7,663 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/r1-refusal-analysis.json` | 69 | 0 | 7,025 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/evidence-audit.json` | 157 | 0 | 5,349 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/comparison.json` | 133 | 0 | 5,053 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/summary.json` | 167 | 0 | 4,471 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/feature-normal-refusal-flags.json` | 62 | 0 | 4,190 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/index.json` | 88 | 0 | 4,184 |
| `docs/reports/vela-0.3.12-b2-a08-offline/index.json` | 98 | 0 | 4,168 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/outcome-extract.json` | 116 | 0 | 4,123 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-b2-comparison.json` | 232 | 0 | 3,908 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r1-b1-space.json` | 136 | 0 | 3,494 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/summary.json` | 82 | 0 | 3,489 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r2-b1-space.json` | 136 | 0 | 3,434 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-reuse-checks.json` | 105 | 0 | 3,311 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/r3-b1-checks.json` | 77 | 0 | 3,117 |
| `docs/reports/vela-0.3.12-b2-a08-f1-real-ae/summary.json` | 68 | 0 | 3,072 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-real-ae/close-preconditions.json` | 99 | 0 | 3,016 |
| `docs/reports/vela-0.3.12-b2-a08-real-ae/grid-undo-user-contamination.json` | 52 | 0 | 2,540 |
| `docs/reports/vela-0.3.12-b2-a08-f1a-real-ae/d1-property-identity/summary.json` | 58 | 0 | 2,520 |
| `docs/reports/vela-0.3.12-b2-a08-f1b-offline/index.json` | 54 | 0 | 2,516 |
