# 0.3.12-G — Integrated Acceptance & Closure Preparation

当前：**G INTEGRATED_ACCEPTED / READY FOR COMMIT / PR**。2026-09-16用户已通过0.3.12技术关闭与封存裁定；20项原缺陷/治理条目按下表有界关闭。**仓库封存须在承载本裁定的G PR通过CI并合并dev后生效，目前尚未记录该生效事实。** 分支 `chore/vela-integrated-acceptance-0.3.12`；整合验收起点为 `dev@17e1b67f4dd81d0b03e8314982051293fdb076a0`（F [PR #212](https://github.com/Lomond-PM/Lomond-Cabinet/pull/212)）。本次文档收束开始于已存在的WIP checkpoint `ccad367eeaf8e2712f2918469f6f1bc4b330905a`，不是本轮尚未提交的裁定提交或未来合并SHA；不预填G PR号。未改包版本或冻结架构，未进入0.3.13。

本报告与[原机器总账](vela-0.3.11-consolidated-register.json)、[A0 源码清单](vela-0.3.12-a0-source-coverage.md)共同对账；保留全部54个原ID，以下25项为本版主办。历史报告、失败与原始证据不重写。`reused` 表示适用的既有证据，不算 G 新执行；本地缺失材料不重造。详细命令、有限回调和 trace 仅位于 `.tmp/vela-evidence/0.3.12/g-integrated-acceptance/`。

## 整合结果与新增修复

| 交界面 | G 实际证据与结果 |
|---|---|
| 装载 | AE26.0x67 / AdobeCEP12.0.1 / Chrome99.0.4844.84 / Windows Win64；正常 CEP 重载后，29个本版变更 JS 的实际 DevTools 源码对应工作树，main 仅省略首个 BOM。未加载第二份模块。 |
| Review→执行→事实→Verify | 实际 UI 单步 opacity 20→60：目标444/A456与 Review capture 一致，批准前0派发、批准后1次；Agent fresh 原目标 Verify matches，Session/Driver/trajectory committed=true。一次用户 Undo 严格恢复 B0。 |
| 真实 Provider 两步 | 同一 objective 生成 opacity→rename：独立显示1/2、2/2，本步骤授权文案与完整值可见；第一步实际写入一次并 Verify，第二步 UI Reject，rename派发0；completed=1/remaining=1，首步事实保留，holder释放。一次用户 Undo 恢复本组 B0。不是“两步全部执行成功”。 |
| C1/C2 负向与 no-op | 当前生产组合 suite：Session279、Execution Facts597、Readable Review78项通过；覆盖 no-op 0派发仍 fresh Verify、reportedCommitted=false/hostCommitted=null、旧命令、原目标变化/删除/切合成、晚到/不确定事实。C2真实 no-op/漂移与F旧命令CEP证据 reused，不冒充 G 重演全部真实竞态。 |
| 后台 Owner＋Settings/退出 | 实际 A awaiting-review、selected=B；在该状态下正常 UI Palette 菜单 Escape只关菜单，下一次进入dirty协商；继续编辑、内部保存、持久重开、外层继续/丢弃通过。正常离开后全局Disable到达A，Review取消、0派发、工程B0不变、holder释放；返回A可读取取消结果。 |
| 资产失败与恢复 | 当前 CEP 已加载 Store/Resolver/Workspace＋隔离storage：26项通过，保存失败→未保存反馈→dirty保留→继续编辑→重试持久化→离开放行。故障未注入live存储。 |
| 生命周期/在途 | 当前 CEP 同实例 Surface公开suspend/resume探针10项、Composition唯一holder＋Owner/Driver/Runtime/Authority六个受控I/O代表162项通过；含Review/一次性授权的Host-held、Verify-held、true/false/null来源与两步停止。全部实例finally清理；不是自然UIDisable窗口。 |
| 普通 Host | 新增 Remove 恢复资料保护；AE正常重启、重新发现target并核对Host二进制文件SHA；Grid及Feature各一次Create→Remove通过，10条Feature表达式清理、原注释精确恢复；四次用户Undo分别严格恢复Remove前和Create前快照。A01/A11、A08/A09、Grid完整模块关联回归通过；没有新注册Detach或扩展类型/空间包络。 |

**G 复现并修复了 A08 关联的 Remove 未修复风险。** 完整生产 Host/registry＋隔离 AE 对象中，合法Grid创建后将后项恢复编码设为损坏UTF-8：原实现先清parent、将comment写空、删除controller，却返回ok:true。修复前输出和正式失败断言保留。损坏仅在隔离fixture注入，未破坏用户工程。

当前 Remove 在Undo group/任何恢复与删除之前，读取所有相关源注释及工具拥有的表达式恢复资料；缺失、类型错误、坏编码和不可读资料明确preflight拒绝。合法空原值与未知原值分开；计划缓存解码后的原字符串/启用态供执行使用。执行 setter/remove 异常立即停止后续删除并返回明确 partial failure / no rollback，不吞错为成功。正常字段、签名归属、registry入口与Remove目的保持；未改Feature模板、Detach、M1 measurement、TBB、共享Util或Vela协议。

新增 [Remove recovery suite](../../scripts/test-ad-component-remove-recovery.js)：**85 assertions PASS**。涵盖后项坏资料时前项零写入、正常空/非空Unicode、原表达式/启用态、不可读资料、comment/parent/表达式setter与remove失败。实现过程中两个fixture前提错误（非Text/预装不受支持表达式、重定义不可配置getter）已保留并纠正为既有fixture依赖边界；不当作产品缺陷，也未删负向测试。

## Provider 超时与可用性处置

当前配置经真实readiness确认：`http://127.0.0.1:1234`、`qwen3.8-27b`、Q4_K_M、1个loaded instance、contextLength131072。没有改模型、上下文、生成参数或timeout。contextLength是加载容量提示，不是实际输入token。服务器INFO日志和本次SSE未提供实际prompt/completion tokens，均为 **unknown**；没有用字节/字符估算成确定token数。

| 请求/证据 | 分支与结果 | 可确认时序 |
|---|---|---|
| C2历史成功两步 | 原句式 opacity20→rename；第一步no-op Verify，第二步Reject | 对应日志15:18:54开始、15:18:55 prompt100%、15:19:11完成；约17.9秒到首Review。仅按墙钟关联，旧requestId/token统计unknown。 |
| D历史所谓“两步前提” | 实际为text分支；正常文本终态，未形成逻辑计划 | 约17.8秒、stop/DONE；属于未覆盖前提，不是两步PASS。 |
| D历史timeout | 后续单步opacity，request `req_da89b586…`，blocked、0派发 | Adapter约120001.8ms后timeout；17:26:40服务器记录client disconnected。原采集未记录chunk，不能断言没收到字节。 |
| F历史timeout | `bounded-logical-plan-eligible` / `vela_bounded_logical_plan_response`，request `req_9c9c3175…`；diagnostics为parsedResponseType=error、intentAllowed=null，未形成逻辑计划/Review，0派发 | 20:53:52发出、20:53:54 prompt100%、20:55:52 client disconnected；任务约120115ms至blocked。 |
| G单步对照 | explicit-edit / local-proposal schema，request `req_e82de710…`；Parser准入、实际Review/执行成功 | 请求3904 UTF-8 bytes；首reasoning约1.63秒，首text约15.97秒，stop/DONE约21.23秒，Adapter completed约21.24秒。 |
| G真实两步 | bounded-logical-plan schema，request `req_730a46cd…`；实际两个独立Review | 请求3674 UTF-8 bytes；首reasoning约1.58秒，首text约18.56秒，stop/DONE约24.90秒，Adapter completed约24.90秒。 |

当前Adapter的120000ms是dispatch附近启动的**整个请求截止时间**，不是每个delta重置的空闲计时器；合法DONE收束后主动结束读取，本次网络层`ERR_ABORTED`发生在有效stop/DONE后、Adapter/Parser成功，不能误记为Provider失败。旧D/F timeout能确认的直接触发原因是截止前未形成完整终态；服务器记录支持客户端截止后中止生成。为何那些请求耗时更长（模型计算、排队、reasoning或其他环境差异）**仍未确认**，不能据同一错误码断定同根因。

G没有重发失败任务或调参；首组单步＋两步均按原配置成功，后续后台Review单步也正常形成Review并按用户流程取消。已证明当前配置能完成这一个受支持两步代表，补齐F真实链缺口；未证明超时消失、模型具备资格或任意两步均可靠。原失败保持FAIL，零写入/holder释放的恢复行为保持。本次用户已接受该残余风险，不再阻塞0.3.12技术封存；其后续观测、资格复核与立即重新处置条件见下文最终裁定。

## 原ID逐项关闭裁定

以下逐项落实2026-09-16用户裁定：18项产品原缺陷与2项治理条目为CLOSED，5项持续覆盖保持OPEN。CLOSED仅适用于本表证据与有界范围，不扩大支持面或覆盖等级；后续owner为职责域，不虚构个人指派。

| 原ID | 实现/合并基线与既有证据 | 后续影响与G复核 | 最终裁定、剩余owner/里程碑 |
|---|---|---|---|
| A01 | [B1 A01](vela-0.3.12-b1-a01-host-json-entry.md)，#202 `9dee61e` | A11成员名准入影响解析；G完整Host三JSON环境1128项，既有AE六组reused | CLOSED — 原缺陷；真实无JSON.parse环境未自然取得，Host owner / 0.3.25 |
| A02 | [C2](vela-0.3.12-c2-execution-facts-verification.md)，#209 `2b380d9` | D停止/F显示接入；G597项＋真实原目标Verify | CLOSED — 有界原缺陷；晚到/删除故障保留受控等级，Runtime owner / 0.3.17、0.3.25 |
| A03 | C2，#209 `2b380d9` | G mutation/第二步拒绝事实、no-op与unknown正式组合 | CLOSED — 有界原缺陷；未知Host真实故障未制造，Runtime/trajectory owner / 0.3.17 |
| A04 | [C1](vela-0.3.12-c1-a04-session-events.md)，#208 `cacc25e` | C2/D消费链；G279项＋真实Session/trajectory | CLOSED — 原事件问题；不扩展持久历史，Session owner / 0.3.16、0.3.23 |
| A05 | [D](vela-0.3.12-d-provider-task-lifecycle.md)，#210 `c80ef96` | E/F共享main；G后台真实UI停用/撤回，重新装载无权限恢复 | CLOSED — 有界原缺陷；既有readiness/Grant真实结果reused，Provider owner / 0.3.13 |
| A06 | D，#210 `c80ef96` | G真实后台Review＋当前CEP六个受控在途组合 | CLOSED — 有界原缺陷；自然Host/Verify在途UIDisable未取得，Composition/Runtime owner / 0.3.17、0.3.25 |
| A07 | D，#210 `c80ef96` | G真实正常stop/DONE/Parser与正式异常流组合 | CLOSED — 终态单调原缺陷，有界；自然异常/迟到chunk未制造，Provider owner / 0.3.25；timeout另列 |
| A08 | [B2 A08](vela-0.3.12-b2-a08-detach-comment-ownership.md)，#205 `f5ea7a1` | A09 V2模板影响，M1c已双版本回验；G251/1134/932项及Remove最小修复 | CLOSED — Detach原问题，有界；G Remove修复已验证；Remove focused85及当前AE Grid/Feature/4次Undo通过；retained注册/UI未交付，工具owner / 0.3.18 |
| A09 | [B2 A09](vela-0.3.12-b2-a09-coordinate-space.md)，#207 `af6f89a` | G测量201场景1001断言、Feature139/749、TBB162/906＋身份70/352 | CLOSED — AE26.0既有包络；AE26.3 DEFERRED、AVfallback真实NOT COVERED，Host owner / 0.3.18–21 |
| A11 | [B1 A11/F1](vela-0.3.12-b1-a11-host-json-serialization.md)，#203 `787cef2` | G2307编码＋224成员名及公共Host组合 | CLOSED — 原缺陷；NUL键明确不支持，真实特殊键限制不改写，Host owner / 0.3.25 |
| A12 | D，#210 `c80ef96` | E/F Surface接线；G同实例10项、真实切会话后明确重试 | CLOSED — 有界原缺陷；正常UI checking时同实例suspend/resume仍未取得，Surface owner / 0.3.13–14 |
| AP-01 | [E](vela-0.3.12-e-user-assets-exit-safety.md)，#211 `ba383a4` | G隔离storage读取失败无写/删、正常UI临时资产 | CLOSED — 原缺陷；自然坏存储不制造、原schema不扩展，Palette owner / 0.3.14 |
| AP-02 | E，#211 `ba383a4` | G保存失败→dirty→retry/restore→leave完整组合 | CLOSED — 原缺陷；同步保存合同，任意异步storage不在范围，Store/main owner / 0.3.13–14 |
| AP-03 | E，#211 `ba383a4` | G输入/读快照/嵌套默认值隔离 | CLOSED — 原缺陷；遵循原模块schema，Appearance owner / 0.3.13–14 |
| UX-01 | E，#211 `ba383a4` | G后台Review并存时真实菜单Escape与外层消费 | CLOSED — 有界原缺陷；其他IME/overlay矩阵后续，CoreUI owner / 0.3.13–14 |
| UX-02 | E，#211 `ba383a4` | G内部保存、外层继续/丢弃、重复/竞态正式测试 | CLOSED — 有界原缺陷；强制卸载不是主动离开，Router/Workspace owner / 0.3.13–14 |
| UX-03 | [F](vela-0.3.12-f-ux03-readable-review.md)，#212 `17e1b67` | G真实1/2→2/2与截图；F宽窄/中英/旧命令reused，G78项 | CLOSED — 有界原缺陷；可靠ID不是捏造名称，原生停靠窗口矩阵未扩展；Review owner / 0.3.14、0.3.17、0.3.24 |
| G-01 | A0/#201及当前入口 | G同步当前状态、总账与唯一报告链接 | CLOSED — 本版入口一致性治理，收尾检查通过；每次封存由项目owner复核 |
| G-02 | [B1 Unicode](vela-0.3.12-b1-g02-layer-name-unicode.md)，#204 `d7dd735` | F未改256-byte/代理对合同，G相关完整回归 | CLOSED — 原校验缺陷；不新增Unicode能力域，Capability owner / 0.3.15 |
| G-09 | R1规划/#201，新定义GATE01–08及来源说明 | G核对映射：01→B1/C1/C2，02→D/F，05→E/F，06→Provider限制，07→本报告，08→资产/文档；03/04仍属后续能力/Context/History | CLOSED — 定义/来源治理，不等于八项产品门通过；项目owner / 0.3.26 |
| G-10 | A0源码inventory与54项总账 | G新增/变更文件映射，证据等级和未知保留 | 本版对账完成后继续OPEN；全审非本轮完成，审计owner / 每版本、0.3.25–26 |
| COV-03 | A0安全链候选范围 | G当前生产组合/负向、真实链与变更覆盖 | OPEN持续工作面；未审分支由Vela安全owner / 0.3.15–17、0.3.26 |
| COV-04 | A0普通Host/tools | G公共JSON、ACK/TBB/Remove及小smoke | OPEN；不等全部工具/AE Action覆盖，Host owner / 0.3.18–22、0.3.26 |
| COV-05 | A0测试/CI/helper | G实际发现/执行/skip，受控边界标注与现有PR CI | OPEN；helper/供应链全审未完成，测试/CI owner / 每版本、0.3.25–26 |
| COV-06 | A0实机工作面 | G真实Provider/AE/CEP/UI与受控组合分列 | OPEN；D自然短窗口、AE版本、IME/DPI/长时仍明确未测，实机owner / 每版本、0.3.25–26 |

## 覆盖与验证归属（G实施/验收轮，本次复用）

A0的388文件及“整文件深度生产审计完成0”是历史快照，不改成G完成数。G沿该清单更新33个生产文件及60个scripts文件的本版差异映射；列入清单、测试通过、局部源码审阅三种状态分开。未变更的后续29个原ID保持原计划和责任域，不因G关闭；没有新ID、平行路线或全仓hash。

- 当前最终完整离线：**198 discovered / 198 executed / 198 PASS / 0 FAIL / 0 skip**，`full-final.log`。新增Remove suite由原runner自动发现；本机所需历史资格fixture存在并运行，其通过不是重新发起真实资格运行。
- 新增Remove focused85项；A08三组251/1134/932；A09测量1001、Feature749、TBB906/352；Grid120/106；公共JSON1128/2307/224与registry27；C1 279、C2 597、D lifecycle208、stream14、E190、F78。来源为当前完整生产模块＋各suite声明的受控边界。
- G源码读取了相应入口/转换/恢复/事件与状态交界，未据suite PASS声称每个生产文件完整审阅。Loader顺序/全局缓存语义未修改，因此不额外重复forward/reverse/forward全序矩阵；既有隔离/装载suite包含于完整回归。
- 通过GitHub只读接口核对B1–F PR #202/#203/#204/#205/#207/#208/#209/#210/#211/#212对应head的Project checks均success；保留head/run关联在raw。它们属于既有PR CI，不是G当前脏工作树的CI。未来G PR CI **NOT RUN**，本轮未创建PR。
- 收尾：新增suite语法、宿主真实JSX装载、JSON总账54/25/29保留、86个本地Markdown路径、格式、i18n freshness、project consistency 288项、git diff --check及scope检查全部通过。源码在最终198/198之后未再改动，不因文档变动重复全量。以上为G实施/验收轮的提交面与检查归属；本次最终裁定只改必要文档/总账，生产/正式测试与最终198/198基线一致，未重跑suites、AE或Provider，raw继续ignored。

## 清理记录与最终封存裁定

G实机验收结束时已完成清理（本次未操作或重验AE/Provider）：两次用户Undo均严格恢复各组B0；仅删除本轮comp444，原comp416和其余37个项目项保留。临时Palette `userPalette_mtzyt48e`按正常UI删除，除正常updatedAt外原资产内容/映射不变，其余五个存储键逐字节一致。必要外观投影经现有CoreAppearance.resolve恢复，未覆盖存储快照。全部12个logpoint移除、受控实例/订阅/DOM清理，Provider禁用/未确认，无活动objective、holder或暂停。随后新Host工具smoke comp458的四次用户Undo均严格恢复对应快照，仅删除该临时合成，项目仍37项、原comp416保留。重启后六个相关存储键与清理基线一致；Provider继续禁用，trajectory active=null，无临时DOM、观测点或暂停，CDP连接已关闭。

**2026-09-16最终裁定：G INTEGRATED_ACCEPTED / READY FOR COMMIT / PR；0.3.12技术关闭与封存裁定已通过。** 18项产品问题与G-01/G-09共20项按本表逐项CLOSED；G-01以本轮入口一致性检查通过为关闭依据，G-09仅关闭定义/来源治理，不代表八项产品Gate均已通过。G-10/COV-03–06五项继续OPEN；其余29项原状态、后续版本与责任域不变。54个原ID完整保留，不新增第55项。

2026-09-16用户最终裁定：接受D/F旧PROVIDER_TIMEOUT原因unknown的残余可用性风险，不再阻塞0.3.12技术封存；原超时保持FAIL，实际prompt/completion tokens保持unknown。保持Experimental Preview、默认禁用、无合格默认模型、readiness≠qualification及120000ms整个请求截止；不调整超时、模型、上下文或重试行为。0.3.16由Provider/Context owner接入延迟/token等有来源观测，0.3.25按固定配置和预定标准进行模型资格复核。若此前持续阻断已声明任务，或出现错误写入、旧结果复活、holder不收束、提交事实错误，立即重新处置，不等版本日期。 G真实两步只证明首步实际写入并Verify、第二步独立Review后Reject，不代表两步全部执行成功、超时消失或模型资格通过。该风险继续关联既有A07、UX-03及本报告，不另建风险总账。

D自然在途UIDisable、同Surface正常UI生命周期，A01/A11特殊Host环境，A08 retained注册/UI，A09跨版本/AVfallback及C2受控故障等级沿原限定保留。历史A08报告中“当时Remove未修复”不重写；当前Remove修复与85项/真实Grid、Feature及Undo证据由本报告持有。完整AE能力、模型资格、全审、IME/DPI/长期运行不由本版代为通过。

**仓库封存生效条件：承载本裁定的G PR通过CI并合并dev。** 当前只是文档/总账落实，未提交、未创建PR或执行合并；不将起点17e1b67或既有WIP ccad367冒充最终裁定提交，不预填PR号或合并SHA，也不声称远端已封存。不改包版本、不自动进入0.3.13。

本次最终裁定收尾检查（2026-09-16）：总账54/20/5/29及原发现字段、其余29项和后续里程碑不变核对通过；当前入口一致性通过，G-01据此关闭。81个本地Markdown路径、JSON/格式、i18n freshness、project consistency（288项）及git diff --check通过。本次仅修改7个文档/总账文件；生产/正式测试与既有最终198/198基线一致，未重跑198 suites或AE/Provider、未新增raw/阶段报告、未执行Git写操作。
