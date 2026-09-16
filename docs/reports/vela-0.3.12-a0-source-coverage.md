# Vela 0.3.12-A0 — 受版本控制文件覆盖清单

日期：2026-09-09；基线 `b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`。来自 `git ls-files -z` / `git ls-tree -r HEAD` 的完整388文件快照：生产116（含helper）、scripts212、docs51、配置/入口9。新导入文档/档案尚未跟踪，不冒充基线源码。详见 [A0报告](vela-0.3.12-a0-baseline-reconciliation.md)。

已审阅仅指入口/封存文档状态核对；局部审阅指下列范围的静态条件/调用点核对；仅列入清单表示尚未审阅。生产源码整文件深度安全审计完成数为0。findings只是关联待复核ID，不是新确诊。tests只列现有候选入口，不代表已覆盖或本轮已执行；独立执行的文档检查见报告。

继承审阅另见 [source coverage](audit-baseline-0.3.11/source-coverage.md)、[appearance coverage](audit-baseline-0.3.11/appearance-coverage.md)、[UIUX coverage](audit-baseline-0.3.11/uiux-coverage.md)，不合并成A0已审或覆盖百分比。COV-03优先安全链，COV-04普通Host，COV-05测试/helper/CI，COV-06实机；COV-01/02在0.3.13–14补齐。每项owner是职责模块，不冒充已指派个人。

第三方/生成边界：未发现受控vendor或包依赖目录；CSInterface.js自称Minimal CEP implementation，按兼容桥审阅，其来源/许可待核，不认定为Adobe原版SDK。AE/CEP/Node/PowerShell和CI actions/checkout@v4、setup-node@v4是外部依赖；完整供应链未审。明确生成项为i18n-usage-report.md；JSON/CSV fixture、资格结果与探针输出保留来源待核，不因扩展名假定手写或生成。新导入zip是历史探针/结果归档，不是生产或新增运行测试；目录manifest保持字节不变。忽略目录、缓存、用户资产与Git对象不计入388；无本轮源码新增/删除。

| path | commit-or-blob | source-kind | production-entry | owner | reviewed-ranges / 状态 | method | findings | tests | environment | remaining-gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.gitattributes` | `06b1281fa40ab40f5fb210fb67e1902dbf789ac9` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `.githooks/pre-commit` | `142aa76f4b6db1833dd32017b96d9cdd0f75c4e5` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `.github/workflows/project-checks.yml` | `8d5be67bcf624f38b69ec7226b466b1991588a9b` | 配置/入口/发布metadata | GitHub Actions | 项目治理 | 局部审阅：1–90 | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `.gitignore` | `da68307aa1038d7fa8514aa779e042d0609ded23` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `AGENTS.md` | `16339c21709b00788249bc70db6b349b97065b71` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 非生产审计证明 |
| `CHANGELOG.md` | `3461b660acae6b3c5f6d538eae1339c9de6b0c51` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `CSXS/manifest.xml` | `b6deb1dc2b59364357a6a534e3fb9e4eb3c754e2` | 配置/入口/发布metadata | CEP装载入口 | 项目治理 | 局部审阅：MainPath/CEF参数/Geometry | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `README.md` | `e3933d59d2f45f3130cc042ea0b809750c7ba2be` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 非生产审计证明 |
| `VERSION` | `449d7e73a96664ffdbdd10970c4fb889f8cfd6b7` | 配置/入口/发布metadata | 项目入口/配置 | 项目治理 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Git/CI/CEP/文档 | 完整分支/消费者/实机尚待审阅 |
| `client/css/style.css` | `712abeae7baf665ac2aa7c2855a91d049c6d7773` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/css/velaSurface.css` | `3ede814817efc0a1318b7f55a84144f966477bc5` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：213–231及相关selector匹配行 | 只读源码/符号定位 | UX-03 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/index.html` | `7c488cc7ea927b30d59b10c88193f8a2975cb7ed` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/appearance/appearanceParameterRegistry.js` | `2a792695d72830708ee615f15badb23f350a726f` | 生产源码 | CSXS → client/index.html 直接引用 | Appearance | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-appearance-parameter-registry.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/appearance/appearanceResolver.js` | `88d218efc81a2dae462933f18ca7559e50b06d3b` | 生产源码 | CSXS → client/index.html 直接引用 | Appearance | 局部审阅：88–94；195–219；230–241；defaults匹配行 | 只读源码/符号定位 | AP-02,AP-03 | scripts/test-appearance-resolver.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/appearance/appearanceStateStore.js` | `1d67fd67d8fce08175fa71c790aeeecad21d613e` | 生产源码 | CSXS → client/index.html 直接引用 | Appearance | 局部审阅：14–23；57–80；84–105 | 只读源码/符号定位 | AP-02,AP-03 | scripts/test-appearance-state-store.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/coreBootstrap.js` | `5c8d31503df9fdbfa6ed76175b9856f7d9a75caf` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-core-bootstrap.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/designTuning/designTuningParameterRegistry.js` | `f5282cc31fac3769019d6047a8cc451064f65840` | 生产源码 | CSXS → client/index.html 直接引用 | Design Tuning | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/designTuning/designTuningResolver.js` | `0c987c3774b298ea8d01505893a34588a626c135` | 生产源码 | CSXS → client/index.html 直接引用 | Design Tuning | 局部审阅：63/78/83匹配行 | 只读源码/符号定位 | AP-02 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/designTuning/designTuningStateStore.js` | `7678151ef976de019847ea92de134bc4817a44e3` | 生产源码 | CSXS → client/index.html 直接引用 | Design Tuning | 局部审阅：23匹配行 | 只读源码/符号定位 | AP-02 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/i18n.js` | `d458278181f7ee56655055167c282e685b6c3fa9` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/lib/CSInterface.js` | `38f189024b342db1d9b4bd53f668ecf29075197c` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：1–文件末尾（桥接口识别，非完整安全审计） | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/main.js` | `2bdb56553518a888a7cdc21a70ef6d26db2864f8` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：2394–2396/4350/4954/8194/9169匹配行；9703–9717；9936–9959；10103–10111；10268–10276；其他退出/保存匹配行 | 只读源码/符号定位 | A05,A06,A12,AP-02,AP-03,UX-01,UX-02 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/colorDerivationRegistry.js` | `95154a8a29de2501624a817a57d6b0492775e09e` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-color-derivation-registry.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/legacyPaletteMigration.js` | `74f5a7d753ebffd0f2e18405842bdf62c76a28e7` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-legacy-palette-migration.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/legacyProceduralPaletteAdapter.js` | `038ca24ebe518ccdcd7c52d88e5e614c965ac45d` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-legacy-procedural-palette-adapter.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/paletteModel.js` | `32a992a71b11b6eb33c24eee570c1c68e20dde90` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-palette-model.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/paletteResolver.js` | `916446451b9b49d5431ef6ff9c9837bc3f6746b8` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-palette-resolver.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/palette/paletteStore.js` | `5a840265c1d7ae4c06a8fe2aefbd6f3cc026d07d` | 生产源码 | CSXS → client/index.html 直接引用 | Palette | 局部审阅：210–232 | 只读源码/符号定位 | AP-01 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralAppearance.js` | `462b3982a99fab64842835f02efc2def177959cf` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralCache.js` | `a36c326f11c3e54e4ec4b7dec754d0e0dbf28792` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-cache.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralHomeBackground.js` | `1ff0ed89c1917f56a30e9932a58d187dd0fc2103` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-home-background.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralHomeIcons.js` | `9fe8e7f986fcb452db4a5518944339e185df3d39` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-home-icons.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralPaletteEditor.js` | `e56193fd3628f2772e93fddca9242ec2ad6479d7` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-palette-editor.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralPaletteLibrary.js` | `e726f785f22697ee3320c4eec7a36d9ba7630bc0` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-palette-library.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralPaletteStore.js` | `3335a16abb90ed13f3d8e67b24cdd8cfa1044c64` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-palette-store.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralPaletteWorkspace.js` | `01e65004b542e0703e337e27d12cec8744964f67` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：534–550；689–697；1447–1456；保存/dirty匹配行 | 只读源码/符号定位 | AP-01,UX-02 | scripts/test-procedural-palette-workspace.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralPreviewContract.js` | `b5b2236647b211a8cbb194d2460348625c0c26a3` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-preview-contract.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/proceduralThemeMap.js` | `bdd9eb0939f2c5b9244cb6b9eb4f3f05b46d1b5c` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-procedural-theme-map.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/settings/settingsStateAdapter.js` | `2d41cbbf113a58fc46ceb604283a08084196bb69` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-settings-state-adapter.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/settingsSchema.js` | `2bc7a30da2d9657d67fc80df59df8b6d51af8728` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/statusTone.js` | `29e9649d105bed0b77f1a029b4a49662d9f0db5e` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/system/systemSurfaceRouter.js` | `18d708d97c01c5a8dc150c6dfa0df70d656ad52a` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：40–57 | 只读源码/符号定位 | UX-02 | scripts/test-system-surface-router.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/toolCatalog.js` | `c2a7219a8978e5e69256b655c17392e1717b79d9` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-tool-catalog.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/ui/coreMotion.js` | `054b7343091c5c42c110e7732be133a50f7c634a` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/ui/coreUi.js` | `2f5c9776b043f954f258c882cccb0a55f37523db` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 局部审阅：456–477 | 只读源码/符号定位 | UX-01 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/ui/motionDefaults.js` | `346423cd907894acf1cd13c7375f35406c926060` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/ui/surfaceIdentity.js` | `678528ae1b3ca0126a0d380dfbbcbd5f6ceed4d3` | 生产源码 | CSXS → client/index.html 直接引用 | Core/UI | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaActivationPolicy.js` | `ddeb0a296c428c317c0917895b932fe484dc61d0` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-activation-policy.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaActiveCompositionCapability.js` | `e85ad3adc226e5e0b95e68e9782af851aa9512bf` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentCapabilityRegistry.js` | `4cd7a43a7a4d59ba5f689b5f470f7b806e753320` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentCapabilityRuntime.js` | `636407cff83ed74e9b345d171ae18b7821df6604` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-agent-capability-runtime.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentDriver.js` | `fcb65f674cd8133e244b4b93e62862d6ecc8b110` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：157–165；245–255 | 只读源码/符号定位 | A02,A03 | scripts/test-vela-agent-driver.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentObservationRuntime.js` | `0079c2426625cb973d2ddba95c447bd219355fc0` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentRuntime.js` | `158376100f96908060250571f6f78c05a4587039` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-agent-runtime.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentRuntimeOwner.js` | `85769ebb0ef095a942a7c3670163f654b3decd0b` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：73–74/134–135/207–225匹配行 | 只读源码/符号定位 | 未逐项判定 | scripts/test-vela-agent-runtime-owner.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAgentSurfaceProjection.js` | `f9d4e5759a4bc14edd77628f46b80b9775594f28` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-agent-surface-projection.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAtomicActivationCoordinator.js` | `eb8e844dd4c1af5690eef901d197e0676c1f233e` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-atomic-activation-coordinator.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAuthorityActivationGate.js` | `340ce808466c0d94a2c0220801eda341169da712` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-authority-activation-gate.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAuthorityEvidenceResolver.js` | `63e4692526dc17475c4a9aad5f0079fd431048b1` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-authority-evidence-resolver.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAuthorizedPlanAuthorityProducer.js` | `19777284f10352443e083c11bbd440a41fa2cdc5` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-authorized-plan-authority-producer.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaAuthorizedPlanMaterializer.js` | `132b58339ba2440db78602301122c903530f2302` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-authorized-plan-materializer.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaCapabilityCompiler.js` | `2a2ad60e51fc50e37a0b2f6f8027ce56f07cc374` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-capability-compiler.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaCapabilityContracts.js` | `86d9c724f0e717ec28d7a3098fb8708720631b1b` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：234–258；228/290匹配行 | 只读源码/符号定位 | G-02 | scripts/test-vela-capability-contracts.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaCapabilityPromptBuilder.js` | `4916d82eae0c894c157d0207c2cae6659774c767` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-capability-prompt-builder.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaCepModuleLoader.js` | `777ed433421c3bfc6405f35fb26d4bfca45d1199` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-cep-module-loader.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaComposerView.js` | `df647030827e83fbcc2fa52226a251282bee023d` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaConfirmationView.js` | `81214c055ac9f3bab906c820bd5df6c206fc1425` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：31–46匹配行 | 只读源码/符号定位 | UX-03 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaConfirmedAuthorityComposer.js` | `bbfffad66e2e5e38f724357ecc5ad1e809801520` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-confirmed-authority-composer.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaContext.js` | `de43870d77ca42682e7a9f3aa64d3ec5717bd98a` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-context.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaContextBridge.js` | `d4fdb4d2e8a8c45e8a596a3752ba9db404ddcb92` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：1752–1765 | 只读源码/符号定位 | A02 | scripts/test-vela-context-bridge.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaController.js` | `d727df409aa8f0251ebf956fb3769ed1c6ae8ccf` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-controller.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaConversationComposition.js` | `db7365bac40e3d36cc5b1519e015d918e5fb958a` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：31/122/131/150匹配行 | 只读源码/符号定位 | 未逐项判定 | scripts/test-vela-conversation-composition.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaConversationOwnership.js` | `bf42598b33f9887b251f7d94d00b776e075b49f7` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-conversation-ownership.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaConversationSwitcher.js` | `fbf330ef75a45021ffaa6d3e2ff853bbec0c1849` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-conversation-switcher.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaDelegationAuthorityCoordinator.js` | `4d2acca971181419eb97fac85d0ed6a29fd7aadc` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-delegation-authority-coordinator.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaDelegationGrantStore.js` | `e756cfebd59aed13cb7b22e09751d1bc42db0811` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-delegation-grant-store.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaDelegationPolicyEngine.js` | `d54e8c6923f23036f240753d3aba80e55dac9cfc` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-delegation-policy-engine.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaExecutionAdapter.js` | `afd84432fb050b37f4b327067d67251ce1b14d7c` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：57/83/97匹配行 | 只读源码/符号定位 | 未逐项判定 | scripts/test-vela-execution-adapter.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaExecutionGuard.js` | `1707f44ae061756394ca4880e2a79b2c4dc662e0` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaExecutionPreflight.js` | `96aa4b12c9bb28d16a2a6381b591b98889093840` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：760/763/807匹配行 | 只读源码/符号定位 | 未逐项判定 | scripts/test-vela-execution-preflight.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaHostReadSerializer.js` | `8bb3c9da7c114d762bba7329b67967bc3d09b7d6` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaLegacyAuthorityBridge.js` | `daecbe746a26c5af3cd5703e1c3a1278236e2a45` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-legacy-authority-bridge.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaLocalTransport.js` | `efced19bf0eb138e559f89f716068a4cd65fab7b` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-local-transport.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaLogicalPlanContracts.js` | `8a9e664749502c4e15ca9e4f94fb990b38368649` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-logical-plan-contracts.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaPlan.js` | `ff82e048a54cda06b103686936274c0c0b4ca512` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-plan.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaPlanController.js` | `510ccacc99ba2ded299964def9eec5c43a82748a` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-plan-controller.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaPlanReviewProjection.js` | `ab70d8689732963fc6bf67b7fec9a24465e88ea5` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-plan-review-projection.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaPlanningContracts.js` | `f92bd94c5ea358184ccf894ecd4ad7e544c19989` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-planning-contracts.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaPresentationModel.js` | `86206c4f54dbc16e5e5e7ef11fed970a7434ea03` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProtocol.js` | `e1d1624ea4fd23ddcf4daeca5b4f0327be6f2b42` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-protocol.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderAdapter.js` | `bc4e6e55465e98680b86a5e4e89b7459a0475069` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：1104/1292匹配行 | 只读源码/符号定位 | A07 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderController.js` | `c8c939fe7ad754ad99ced76cdc1292b274b24d96` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：473–530匹配行 | 只读源码/符号定位 | 未逐项判定 | scripts/test-vela-provider-controller.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderIntentGate.js` | `5c8df7c28d3b440087bd2d79f9bc73d67aa139ad` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-provider-intent-gate.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderProposalRouter.js` | `092fbcbd8613ac823611bb1d98bfc932a75ff530` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-provider-proposal-router.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderRequestBranchPolicy.js` | `6fbfe889a8964b3c1c3d1d14ccb959a9089b0882` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-provider-request-branch-policy.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderStreamAssembler.js` | `5a229e38b54a3816a5cb8478ddc00a1a92a7ba43` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：24–47 | 只读源码/符号定位 | A07 | scripts/test-vela-provider-stream-assembler.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaProviderStreamEvents.js` | `cbe29160d99f958ba376efb075937eb0f5e4e59d` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-provider-stream-events.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaResizeController.js` | `24afedf2a40e55355ba9292daaa737b6a9ce65a5` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaResponseParser.js` | `5d4a8169b100c8945092a2524558e5c594833c06` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaReviewRuntimePort.js` | `f6fc3b08df9a3bc3e1b1365b5708f740eaa8fa38` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：32–38/54/64匹配行 | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaRuntime.js` | `18ecc93486ee9795779f9647ccb6a6800f64af71` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 局部审阅：477–488；829–838；352/1007–1019匹配行 | 只读源码/符号定位 | A02,A03,UX-03 | scripts/test-vela-runtime.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaSessionRuntime.js` | `3611e80c354bc48377c859eeddc147f1d2c1eff9` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：56–68；236；241–305关键匹配行（非全段覆盖） | 只读源码/符号定位 | A04 | scripts/test-vela-session-runtime.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaSurface.js` | `7f7dc4809d4004d317104b1aa8055c1849dec843` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-surface.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaSurfaceController.js` | `5d3d484bf6e7bb3a88140cfcecd372f1ca7c9b9a` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 局部审阅：174–180；220–270；302–305 | 只读源码/符号定位 | A05,A06,A12 | scripts/test-vela-surface-controller.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaTaskRun.js` | `3f5ec8e47f5af78a2c572929388c1a2161ae7dd7` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-task-run.js（候选） | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaTranscriptView.js` | `a82b759ca64bed6aa8fc2e5ae8e6d9a3a943e38b` | 生产源码 | CSXS → client/index.html 直接引用 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `client/js/vela/velaValidator.js` | `891290593e7ed1c527f87e1218348eecd004cf1a` | 生产源码 | main/loader/消费者间接接线待逐项确认 | Vela | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 浏览器/CEP | 完整分支/消费者/实机尚待审阅 |
| `docs/DESIGN_SYSTEM.md` | `e4ef56ee64e4a485fc03fd60a5c4d1ad0f5cb6c8` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/HANDOFF.md` | `d8e688ec5f31fe79f146dbcd4700a95b3987ce16` | 文档/证据 | 文档相对引用 | 文档/证据owner | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 非生产审计证明 |
| `docs/KNOWN_ISSUES.md` | `b28085d40093e8832b30c53842f744c154059c75` | 文档/证据 | 文档相对引用 | 文档/证据owner | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 非生产审计证明 |
| `docs/PROJECT_STATE.md` | `e9d4b24c58126f6c0ed20ba2008b2319e5c62cc9` | 文档/证据 | 文档相对引用 | 文档/证据owner | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 非生产审计证明 |
| `docs/SHARED_COMPONENT_CATALOG.md` | `4bb17ff63a745cacf738effaf0594c9663ded547` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/VELA_ROADMAP.md` | `c47baba82e69ce3d1db9449e29b54fea2eaff251` | 文档/证据 | 文档相对引用 | 文档/证据owner | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 非生产审计证明 |
| `docs/design/procedural-appearance.md` | `785ae3ddd941ef1d4d89680b41ea4d34118b190d` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-0.3.3-closure.md` | `b99a092eeae9eca1c2ab9b5f12111ae58f2c2e29` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-0.3.4-closure.md` | `225660ce14188a968e0b49deab9fc9aee9f74bc1` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-0.3.6-closure.md` | `6fdda9a4cc0049f737f5cc354e2a8e31f990a40f` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-architecture.md` | `2f62df04d5eb873fbfd63217f12b476a8761de5d` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-deferred-0.3.4-constraints.md` | `3fc933322b3b73300d32a02ab70d332f40ce267c` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-observation-context-plumbing-0.3.3.md` | `e2a0c2c8586f81ffa0e8ba4d5524d01a9d37a6c8` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-runtime-contract-foundation-0.3.3.md` | `bd1c7ebb4bf4cdee9a0d5e0c6f0b9b4f4a48574e` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-runtime-lifecycle-integration-0.3.3.md` | `097b9ed43a87f981034b7641221b1d55481a265d` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-runtime-shape-0.3.3.md` | `38093963999e6ec8094f0122aa657f0b45af7bc7` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-runtime-state-convergence-0.3.3.md` | `716eaa501f52dee630815ca29530b8ae6796be8f` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent-surface-subscription-projection-0.3.3.md` | `4b5a325a4a653d5261e3a8a3544278f225d1b634` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-agent.md` | `514c1bab70450db70ad3513710e412d05e46020a` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-context-architecture-0.3.10-a1.md` | `def32df773c9f3aa192d104bfab7d97135a25d67` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-context-selection-0.3.10-a5a.md` | `024310c58077066ac86cb457beceacf756acae65` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-provider-capacity-budget-0.3.10-a3a.md` | `08307339ae24beee87fc430ce2905f5374eab579` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/design/vela-verified-trajectory-0.3.10-a4a.md` | `e61b49c77b8a8eed4632faea3e53a2842f356fd1` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/FINAL_SETTINGS_IA_PREVIEW.md` | `c13c97123ea2eb4bcebe1672aab215253a216edf` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/FULL_DESIGN_CALIBRATION_WORKSHEET.md` | `c73cca5daa64d0e00d0fd5e5ff5f2f6b8a3e75a9` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/FULL_DESIGN_CANONICAL_PROMOTION_REPORT.md` | `fcb537b9243911a28b777617a84b1d50731973c6` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/documentation-reconciliation-post-vela-0.3.9.md` | `96e6e0b00cb4c2f5b5f1209d7d1dccccbce00548` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/i18n-usage-report.md` | `3f97fc01dbaef7e8eb8e12fbe313b70af9ec5d11` | 文档/证据；脚本生成 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | report-i18n-usage.js --check 本轮PASS | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-a2-context-evidence.md` | `b3f06dcc122114654110c5f068d8e28a0f38a67e` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-a3b-capacity-budget.md` | `f799a189b078c8fcf9272eed5335ceb7b43cbb43` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-a4b-verified-trajectory.md` | `8f19336e402e16383289e6ba3dc9be0d1b8b2fe2` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-a5b-context-selection.md` | `ae84f51f29d79a67a35b8e494b7d2630ef51409d` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-a6b-observation-turn-isolation.md` | `9ec24c77ac6c9f63abe3b182681e1ff3af2d6506` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.10-context-closure.md` | `8436b5edab66345e703b8bb0a883fa484373ebcb` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a1-conversation-ownership.md` | `cea6e2534aa1aa43a601ca103dd6c6ab6d3c3df6` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a2-conversation-presentation.md` | `985e2840c5f5dcbcd1c1c6382b0aa11cdf5f590d` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a2-f1-cancellation-reasoning.md` | `abaf299ca79924191aa7bb3b70ce6c4c160a5bfe` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a3-real-ae-evidence.json` | `cce7f4bf4660ad8faed0903c33fd5a5b8b7d302c` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a3-source-routing.md` | `49db336b4299340e694682aff32e9e45df5125ae` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a4-runtime-composition.md` | `1c93fc78e71c713f95eef04aa7b2753d806f5828` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-a5-conversation-selection.md` | `79dd33d05c9e61c72a1286fb03ad3aedf6d10e78` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.11-integrated-acceptance.md` | `2b52e7fae7e8c9f62ad75cab0495d958ed3bd314` | 文档/证据 | 文档相对引用 | 文档/证据owner | 已审阅：文档状态/证据边界 | 文档核对 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 非生产审计证明 |
| `docs/reports/vela-0.3.9-c1b-f5-native-assistant.md` | `e4603ab7e3349bd8e51a945b5673c17db0ee4151` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.9-c1b-f6-measurements.csv` | `5f32c6de9ad5c7ce0d920f7f822cfc78539e85f8` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.9-c1b-f6-response-budget.md` | `356b3fa9be17bc2c78423e5d14a5ed160de9dc34` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.9-c1b-f9-probes.json` | `cc006327c4894237203218ac17ffb11e90f92c15` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.9-c1b-f9-routing.md` | `d07b525a82316196db36dd87f45ad43406902466` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-0.3.9-c2-closure.md` | `86002d8fccba1aa11138c079533731ce912bef5b` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-c4-profile-pilot-results.md` | `37a6b31e348685a796cb783949657c6013739d09` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/reports/vela-provider-model-qualification.md` | `7d0e42f20b8f8c0b25e6febf2736b8c53b360b24` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `docs/schema-drafts/ad-component-kit.registry-schema-draft.md` | `32e58910d3a0c6b43f7593be13f9e71227638c9a` | 文档/证据 | 文档相对引用 | 文档/证据owner | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | 静态文档/数据 | 完整分支/消费者/实机尚待审阅 |
| `helpers/win/eyedropper/windows-eyedropper.ps1` | `6866e354ed98e27634e57cb07d37c5cc03a0bc17` | 平台helper源码 | main ColorSampler调用待逐行核 | ColorSampler/helper | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Windows PowerShell/WinForms | 完整分支/消费者/实机尚待审阅 |
| `host/aeUtils.jsx` | `f296d5d659d52d8232f36bd35c9520149c819fee` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/effectUtils.jsx` | `0384ce2a6fad6a6a07f4069813f007f1456405c2` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/index.jsx` | `7f3912e1ab5518adacf9c38b828a3fcc8551631f` | 生产源码 | CSInterface.evalScript Host入口 | Host/所属工具 | 局部审阅：15–42；262–266 | 只读源码/符号定位 | A01,A11 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/shapeUtils.jsx` | `e33fa5d375b63d04a127b94db5afe5e7ee6940b7` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/adComponentKit.jsx` | `abb3bdf9f22ce8943c7f3c7ba4f5deb0ba0c8017` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 局部审阅：110–131；742–800；1405–1416；2416–2447；调用符号搜索 | 只读源码/符号定位 | A01,A08,A09 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/adComponentKit.tool.jsx` | `8c967b3dbb12df55f25c97f56beb07b612637aec` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 局部审阅：16–18 stateAction；动作分派符号搜索 | 只读源码/符号定位 | A01,A08 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/proceduralAppearanceLab.tool.jsx` | `18033c3907427bd265af648228c7d51f60b8a1ee` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/registryControlLab.tool.jsx` | `9c9dc26182d7ddb0cc9dde258905d3717d8ba4a0` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/selectionInfo.tool.jsx` | `5b7c53355a7e3298ab4a18a3dc96e1f7cb40db21` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/settingsRendererLab.tool.jsx` | `004005049f8f86ae19ee194b30ec654441dda159` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/shapeAdd.jsx` | `cc0f6c53f91e9c890684916bedbcc35fc20b93ae` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/shapeAdd.tool.jsx` | `269546d0d985f94d2895215b6930b76fac2e4b2e` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/textBackgroundBox.jsx` | `f5a7c97dd12465ba43919f9b2d39df5e7100f614` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 局部审阅：216–243；297/353/356匹配行 | 只读源码/符号定位 | A09 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/tools/textBackgroundBox.tool.jsx` | `7dc32d7f0d4573bbec26634efb2fdd91de9714d5` | 生产源码 | registry/include间接链待核 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/vela/velaContext.jsx` | `a0e6f6f9ce82ffa0f98c5ca6dfb883cf51205604` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | scripts/test-vela-context.js（候选） | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/vela/velaExecution.jsx` | `abfc84a338d07379ef078975b434854e3cab49ee` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 局部审阅：135/175/182匹配行 | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `host/vela/velaJson.jsx` | `af955fbc80b08c26944c30c8e22d1e061495a037` | 生产源码 | host/index.jsx引用/装载 | Host/所属工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | AE ExtendScript ES3 | 完整分支/消费者/实机尚待审阅 |
| `scripts/check-host-project-version.js` | `62004ea4c77aef94f6fd879b89f489ba813cbe6c` | 检查/runner工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/check-project-consistency.js` | `e61a95dff6b0a3f4bd69ebb6eec58348c9ba0cac` | 检查/runner工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 局部审阅：1–70；本轮实际执行检查 | 只读源码/符号定位 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/probe-vela-multistep-routing.js` | `13a832d9774604fe8f53b65d2facb645dd97c9d2` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/probe-vela-native-assistant.js` | `6acfd9d827b4c3339fa03b993fa204fcc77d8d6a` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/probe-vela-response-budget.js` | `88809250ed015335e6e9c4cc9a2ee4c130df777c` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/run-vela-provider-model-qualification.js` | `a457dd532aa13b8c904167ddf387c2a5d95c3209` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/velaProviderModelQualification.js` | `789202bb14bdf4725b45e66aaeb18c47652a3ecb` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/diagnostics/velaProviderQualificationRubric.js` | `e3bb78a79689643fd9c9ec4d14014d348eaed7bc` | 诊断/资格工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-bounded-union-transition-v1.json` | `1072c2ca5be59f5d3baefb9686c16b6a2267c868` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-bounded-union-transition-v2.json` | `844b7f281282d0dd50a2a8642efe4eefef8f447e` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-branch-policy-v2.json` | `62255568909868ae47ede06c7bbfa8bc0e67e333` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v1.json` | `8435e6b0c25f32b745815d9c241642455a0327c7` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v2.json` | `865d1f2494331510987e49cfe00f2f9a1114e217` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v3.json` | `17150f798886ba653ec6ae83181644d09d882c4c` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capability-contracts/provider-contract-baseline.json` | `42670dca210744c0e18a8cad1f6bfaf5ffe0c7dd` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-capacity-budget-baseline.json` | `9bf22de82f293bc634b2871e2577e2e8f8496701` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-context-evidence-harness.js` | `143e329ce66e302ebe3d7366f5e20db46d3b9f73` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-context-evidence-baseline.json` | `4c4d10579944d681d8e0130d93cf603a35173588` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-model-qualification/c3b-qwen35-4b-derived.json` | `27b09b414275d08a2959eb4920ac1278905edd33` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-model-qualification/c3b-qwen35-9b-derived.json` | `d0ddbc4d580f7d74b353bd39f22f40039a40780f` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-model-qualification/qwen3.5-9b-q4_k_m-nonthinking-derived.json` | `1457328f80dc9e92aebe0a76e3fc4bb393bd833b` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-profile-qualification/acceptance-rubric-c4-v1.json` | `87b9fb9c9e55445b30835c8ff52d4458e2f393d5` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-profile-qualification/acceptance-rubric-c4-v2.json` | `195512a782d8063b2e7a43cd3c03a3180abac12f` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-provider-readiness/lm-studio-models-native-v1.json` | `f2135382224a6e2d3b1c8400172e91a6c17e98b8` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-routing-harness.js` | `2a02a972523953246700c143b434e22506aa2b78` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-selection-harness.js` | `57bae80b42c44b7c6244ede6e51bf4c45a80775b` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/fixtures/vela-trajectory-harness.js` | `2d5cb740b7d3a70a48437d6f768d551f932268c1` | fixture/测试数据 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/report-i18n-usage.js` | `0b060564c9beb1882f96fe6e11a2cb6b0476d280` | 检查/runner工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/run-all-tests.js` | `60a3525128910d426d724f218c804b3a60488560` | 检查/runner工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-action-button-contract.js` | `4027c5522fafd4e44ee66ff9b809494d345e5929` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-appearance-color-alpha.js` | `76fdde7ce96a63913d1157d4d332c6a4e7f61326` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-appearance-parameter-registry.js` | `4567cdfe3da7484beb523d744fb047f337fdf90f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-appearance-resolver.js` | `ab9f204563b3eb94c21be479fc75d1ebaaed9e8a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-appearance-runtime-stability.js` | `452ac6d8204bc46889bf8fc5f26244fcc454716c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-appearance-state-store.js` | `04197ff5d324c88eb956a5554869138e34ffb412` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-button-variant-provenance.js` | `037e9a578cc482e3f67458555fd7e9623337846f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-calibration-authority-convergence.js` | `3107d47539e8b7e4351f85909a95c6365550b550` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-calibration-consumer-gaps.js` | `1b4e2687ca5a1e60b9466ad2675177912292bfc9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-canonical-promotion.js` | `520a5db4d871592e714f47290fde2515414c85c4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-color-derivation-registry.js` | `e94110152fd6f93a34b3f5dffb2d10a2bf62a24a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-bootstrap.js` | `1bad4a4749c5c89cd66c05904f5601b580eb0e60` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-ui-bezier-curve-field.js` | `c080ab919f242e6fdd672f412635faede0a157e7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-ui-bootstrap-namespace.js` | `fbddb868d716168c2dee637d6b6db8fd09eab40b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-ui-component-contract.js` | `79dd8af534ff5e36b0ca3451c7e6a7a129e40977` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-ui-shadow-field.js` | `59930c383b3320f83788d7e2501aa37cf97851cc` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-core-ui-visual-contract.js` | `841572d08cbe56a7a099fd7ba4f90b6aee1dc4b4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-color-alpha.js` | `cbac60e8a8a6d521e22048ba80a73040a2732d78` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-coverage-completeness.js` | `436e896e7a3fc79289e4a32b1005ae32be76eed9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-effectiveness.js` | `a1831281259b63021de7a83a1bf56d88cc46dbb7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-gesture-boundary.js` | `6725de8e4bb6c701df42fcf03d552f91df7d7f8d` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-infrastructure.js` | `64bab3c74df1ca5a0c2f4778e49c5915aca2ffcd` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-motion-ui.js` | `fd632325c739a4684c78bafd89df3a9f60761b04` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-shadow-product-path.js` | `a1db054ac7dc87d5f2c730a9de6a1c76525b4ad8` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-design-tuning-transient-calibration.js` | `24f0639ef4b817e8ff8ec511d23dd0d80b63ecee` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-developer-mode-settings-return.js` | `187627a9a5ed2b2aa8d548ddd83e9bfd7c29754e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-editable-scroll-contract.js` | `18926b4aa73aac28bb0526e58e67987bf54dd3a3` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-elevation-consumer-coverage.js` | `4f706a01b302ad7b8546eda84846d0d99b2f275a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-elevation-contract.js` | `572e4a03d5991b0a50f858e2ecfb0d043f567534` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-generated-report-guard.js` | `fab33d893cee945d7a3f2a5ce0904694961883ad` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-global-status-i18n.js` | `eb9776e310a0670983a9afc3d51cf9e42492fb47` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-grid-host-contract.js` | `6f5a5b5fd7abcae110ea18935d110e2a3800cb84` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-grid-refresh-idempotence.js` | `1e1def96fdd20a45d92d8e4f94f0878045a80691` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-host-registry-transaction.js` | `c7297195406cb0f7a0084d39d5385ab7a4e17d38` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-interaction-semantic-contract.js` | `5d1a4646c5aec29488ec1a9dd9bd43233946ae6f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-legacy-palette-migration.js` | `c94852b3712229d258d44017bbc7eaf5b0f85423` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-legacy-procedural-palette-adapter.js` | `83a4cf3fa5e610a8b5a6085f307fa50c24db5bb3` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-motion-contract.js` | `cc4908719cb603eaeef3b6054cceea1bb8f079d7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-cep-browser-bootstrap.js` | `248278d3144a6430897e4c3c61a6edb9f5d8938a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-closure-authority.js` | `088363b06c08584b1b0a613da7701e8aea27f16e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-model.js` | `27711acb9cd48d9691e8971101a17093f865b6cd` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-production-integration.js` | `a555b54062ef98afabefb63fe53e9e362d64f15d` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-resolver.js` | `0b07ba3ab9b0598a59f66720049a6c642f59528c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-store-v2.js` | `fdf1a3cb2e7d77dcc7505a07c01093f691a295e4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-workspace-continuity.js` | `a21f80641254972a49c4bda699ea228c972c7f17` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-palette-workspace-v2.js` | `7ba5ec61ebf3aac523afe8f02d8cf39caa3dd18c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-primary-text-palette-assignment.js` | `b0e97caea330b80f1871a5390aa2c9782689faf9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-cache.js` | `d6aac3e07fb0ad93bc3e0f8d9e2c1727a6832c4c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-determinism.js` | `30cf8c08ce063bd790754940c4961bb0ba53e37e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-home-background.js` | `22a3984549e0df5f662d810120001a95f2e19c25` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-home-icons.js` | `ebfd43f37035b4338e02efef2d34ce74955f8674` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-palette-editor.js` | `1a002fbf100ab76cd709dd521b275dae9ebf9b66` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-palette-library.js` | `5ca1ee8aff438a01487bdbeb0af9322d02260833` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-palette-store.js` | `9bdfe89160eec5f22b98f6954a4a62edab7b84cf` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-palette-workspace.js` | `b5c576c85a9b58e6917c67ea1629c42893df5ffd` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-preview-contract.js` | `02d07c9a182733fd9c1ea48b0dea67eda5b0fbd4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-procedural-theme-map.js` | `09d3dbbb376c47596ab6d03f03ec6926823c73a7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-radius-contract.js` | `d0097f8b1d3722c703eaef20ae996240f91874ba` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-range-number-layout-contract.js` | `4bfdec7942e961b17e25fe475a400ba91d0a4ce1` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-registry-control-lab-completeness.js` | `ff6a98bcc356a4a1d2d4b4bc73e6f274ecbb02b5` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-registry-field-row-provenance.js` | `a96ef484a7e05c7acc60be48737a18507d882d14` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-registry-number-support.js` | `3d869d2d9f06704cd642d45422889356a7538869` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-registry-primitive-provenance.js` | `f791b85012b383e35b25a91c5c0f472e5d7ba92b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-registry-tool-schema-i18n.js` | `5af2150fac0136d1291f3aa806f5cff7a53b8515` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-scroll-region-contract.js` | `0aa9033e93f40b2a44a40a19d63552dfcb7e98f9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-appearance-disclosure.js` | `9154766b5bb91a8d933557b5b9cb9715902f2ab5` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-control-contract-convergence.js` | `f0acb59e45eafe297998e5ae796cdecd4821ee19` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-control-followup.js` | `36bc77f2e04d042ad7665ed15ef1ad59b8757426` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-information-architecture.js` | `fd94c2d77908679f1c2a1cdb65a2367c0fba0380` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-peek-contract.js` | `45ed7d19dde2babb6fa81e35e44a8233e45c45b9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-presentation-session.js` | `028ccdadb1776a093e7ba0ee70b7b8d85aaa16a4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-startup-bootstrap.js` | `cabf98cb17195db419652682575cf3f5af7b2d34` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-settings-state-adapter.js` | `12bf97929da296771e7ac69c850312c25465849e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-shared-select-lifecycle.js` | `5efebac5c3da6db044d660fe81fe153e9d74099b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-spacing-contract.js` | `3a6516d7a1de054b9967c11d5f418e29781b33e5` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-startup-readiness-contract.js` | `af4e713c1df0436fb819cbc08b87a11a25ef9608` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-status-tone-contract.js` | `0e0aa73fa0e054fbd2f5eaf66b67a5e91fd35e87` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-surface-identity-contract.js` | `74888ed962eb38e230c249105e17694379af4d6a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-surface-layout-stability.js` | `24d88b8a390c00837fe362d44d167f8d7fa2784a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-system-settings-integration.js` | `050af080f2af7f71f71c19735e8e28be19e01f1f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-system-surface-router.js` | `8d81d35ec1c378cb4e2040e1cb5be3c8254d2092` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-theme-settings-integration.js` | `fc2343cf25b7cbeb64c461afca94f4847731031b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-tool-catalog.js` | `acd4d0831fd7fccac186faf583cbe6809506c8c8` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-typography-appearance-foundation.js` | `592e3e8050e8aab7e134311efddc58027ff37df4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-typography-appearance-ui.js` | `1550efabb46ad8167d3d732f37baf62706472296` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-typography-contract.js` | `a585ab15b03f250f5a18b480a3646251c09a2930` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-typography-stress-contract.js` | `33ea9ad614841fffed370bf8d914dc42e4e53654` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-ui-token-contract.js` | `e9277bd0763f9ddf8f93662c476a63c09c7198ab` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-actions.js` | `e04963e0d23040ef82f9e39ecec6b783c8000cc8` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-activation-policy.js` | `2759cf474338a85a9b25a221f763f6cb4aff7f18` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-active-composition-diagnostics.js` | `da32276584cc9f872b416c76cff39b6981767668` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-active-composition-observation.js` | `97a55f7ede6adc41121df770dc573af65a476a48` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-capability-owner.js` | `c7f21765b947ec4dcd8eebdfda8f9c2fc4a4f216` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-capability-runtime.js` | `b8ba5a69ad83d947d92f8387e2dcf516b7aabd24` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-cep-hybrid-modules.js` | `c72aff85a131df0ff635e197bcb4f398e6d7705b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-driver.js` | `aebdf9d112820dd764ad78ad9b2887da732d6e73` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-observation-context.js` | `2bc0e04c84492bc647f90aeba082b8b4ef789788` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-production-lifecycle.js` | `1b4c83ee072170f02a030928a89817c5c73c9223` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-runtime-owner.js` | `949bdf6654ca06bd3d1067f0f8206a107a29a375` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-runtime.js` | `62c98694741ba54400393f466417266587bc80f3` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-agent-surface-projection.js` | `2b1c85e80508128f2ab7b20607bb7917207b9916` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-atomic-activation-coordinator.js` | `37a4cef22d2f2f1767c6d135629adde6fb66dec3` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-authority-activation-gate.js` | `0e0d5720e7c5b7aa798d0ce6d84b2f40830ccd2a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-authority-evidence-resolver.js` | `aa3ec0c0d8316a27c58e5ac62b894b5aa3d26908` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-authority-production-composition.js` | `f1a31eddf9195f805c10ebae8bd32f509eb59cc6` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-authorized-plan-authority-producer.js` | `b522c160dc2fc15f1e6160a7b997bee28a2db141` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-authorized-plan-materializer.js` | `f04696e104d9ff8227cc7fb345df0a945a7c0dbb` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-browser-bootstrap.js` | `6c9597ba41c98e7764d9e8cd74433d7377d71a62` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-cancellation-reasoning.js` | `da003a8bef699cf3e6d0be71a18e4ec3bff9026f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-capability-compiler.js` | `c0fadf151908a98f2e46d80c7c8cd35682bd3e7d` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-capability-contracts.js` | `cea9b61d576590e673afb2f392e20b278407fc68` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-capability-prompt-builder.js` | `a4233ffba49d0ac3b0773ec8bb0275a7d3fe6193` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-capacity-budget.js` | `4fa49709dec4d1e1f7036208f5667bef22939493` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-cep-module-loader.js` | `a0dcdc2c85bc65cc43d9363bf46a69ad8a371f79` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-confirmed-authority-composer.js` | `798015c8a12553c7a52a2e69a65f08e3b671e47d` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context-bridge.js` | `9638f43647bb9863b6f96b84ae7f9c8f8fa0db52` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context-host.js` | `540f5e247ba2b43e4f9c58271545d394ec548ed2` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context-property-value.js` | `ca4d8578a07eb4fdc3ce83d0d1852e853e612a39` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context-selection.js` | `ed3caca9e9e1ed67b9fa19600dd95d4dc7d41dae` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context-target.js` | `261003b4e5a96455e9e9df03e11002d17a758777` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-context.js` | `5961be9c58e390557e79b5b5e993a513bb0a3c59` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-controller.js` | `a1da8465abe1b0d97b25ad4926a198cb6303bb6a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-conversation-composition.js` | `077ad8d064276c9b604f6e5406494a0f9eb2d7c3` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-conversation-ownership.js` | `96192bbeb7dc3cd8025e24b86781b6f478020576` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-conversation-presentation.js` | `b123f52ee290580daccc85938ba4cf7a57cbba45` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-conversation-switcher.js` | `319bb36dee6a6fd2263d0030d8f62a72adb96c01` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-delegation-authority-coordinator.js` | `ca41041751a48c0326a3f901fa5313ccb47e782e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-delegation-grant-store.js` | `aeb7d4297a67695c46884b3139835c199e14b535` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-delegation-policy-engine.js` | `44dac72daf21855f7f63d997dcb8e472acb7b57e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-execution-adapter.js` | `11019e2f57f4b22503c1c27b10dcd15bfe9943a9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-execution-host.js` | `0eea621f8857ee1a2b704ea42b32e0cc94156c41` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-execution-preflight.js` | `48d59f35f7a0174951e6b31438e8d521862b918a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-guard.js` | `39c7b8f2f4493502516ed128ab888e8304012634` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-jit-binding.js` | `ee9b111ec0757806b1ffc972009429ae342d3b1f` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-legacy-authority-bridge.js` | `9eb35ecc343598572da148f5aed6b19f110d8aa6` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-local-provider-flow.js` | `e546dfbdd295d9345216074089d73c1da5c4c920` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-local-transport.js` | `955b108d9449f7cb2d1de95c7b20babe8764b65c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-logical-plan-contracts.js` | `31686e2b1777ce9f36c60756a5e459375058eaf6` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-multistep-presentation.js` | `0b5c26ffd9861ad7e14825aebcccc13a9d08fb60` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-multistep-routing.js` | `784ebc2edadf1f6f299e7880c6f679df9b119156` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-native-assistant-output.js` | `2ec8f155da9743cc3a5802c28d483e9f51ff21cc` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-observation-turn-isolation.js` | `130b68081e0d6f8dad5c7051ebd75a768173e2e1` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-persistent-surface-integration.js` | `95e9c7b0dd2b2e755025546832a8d5b2f3f20c17` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-plan-controller.js` | `999dc12224a1440402534add0cfafc7f56308f32` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-plan-review-projection.js` | `3ac3dbc5de12d65e4a261389dff6e4e3e8f41c6a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-plan.js` | `f58f477d3a7e89a5e2357bd802daa66569675c3a` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-planning-contracts.js` | `4591e15aa30d157a88636be32d4499b4feb69a82` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-presentation-model-streaming.js` | `aac18a7805b85c3849c6a55eff6a544fd877c0bf` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-prompt-stability.js` | `90058dd5173f76a8d0ee031c83bffa312f76d452` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-protocol.js` | `59c82eb3edcf1ed62f8e09a67cbec1aad7f7583b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-branch-profiles.js` | `8be6da839813a1ade17a39705200c7cb544e6866` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-context-evidence.js` | `5f21712a2cf06632c350f23f538812c84d8debd9` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-controller.js` | `dfecb845af6df6eeb38f1bdb804b198dbdb7970b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-intent-gate.js` | `c1ad5227e31bfebf0e6b3710ea191e754876187c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-model-qualification.js` | `eed4e9029130be4150710b56cd5a42e1811f74f6` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-production-e2e.js` | `ebdf515eed9a7186902f9045def02a7ce48ebb5c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-proposal-router.js` | `8f35cea7658a7868ece0cad2cc86d1e64246bdf2` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-qualification-rubric.js` | `26896f6379ac2d1475e0a72bbdfa67e4594e9546` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-request-branch-policy.js` | `1683976e3f86ee7e193649f5b9de7ead6e9972e7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-stream-assembler.js` | `fbd04058fbf4c7de444cbce31388e7ee3473f90c` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-stream-equivalence.js` | `320a9ffa05971d8b55ae1f405b77df74b5d82324` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-stream-events.js` | `3f508f958097b96d0291c88230de8b1b7675d603` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-stream-lifecycle.js` | `45f200fb4bb4a66eab2a050571be15dc4fea61cb` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider-stream-publication.js` | `fe953224602fb118d72ab4fe36d20a74fa4f75dc` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-provider.js` | `4a48f1f29c7af7a5c0ca3451a171e8d87a554190` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-response-budget.js` | `277a2991dffe9aa51aed05c746329493888b5cab` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-review-runtime-seam.js` | `f540b9e4ec90bc2468c4f665ecbeae48a6d1a775` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-runtime-status-view.js` | `7bba6e1fe2cbf011fb9917cf73b4e1416925b1a4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-runtime.js` | `19b92bfe8416a7267f9f1144f3f6fbb8fbf73575` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-session-runtime.js` | `27e7b711d63253b7b45e00c6ecbdca869d06e1a4` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-settings-integration.js` | `176821d15de48569a3b9a5c9681de64abb8a1f8e` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-source-bound-routing.js` | `95227b6872ea77ecf817ae75d310228a1a7fe350` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-spacing-authority.js` | `ce40dad226fa40420e7e6a482e5fb89d7157a3db` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-surface-bootstrap-boundary.js` | `6bec5e36940f541ccaee341cbe3b2bc6b1836118` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-surface-controller.js` | `5d505c889ca8a70bcc7f716d8bc3029ed7564d95` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-surface.js` | `f67e29a443d1baa01078f633b11577e56c2f4012` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-task-run.js` | `79ac829ec03437cb4681926d7c649c0338572187` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-transcript-reasoning.js` | `cf2ea291ad8936bb629089aa9aaa18f50a4d5e3b` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-transcript-scroll.js` | `2ce4f2fd6551b42d10419c9fb0795ba411087bc8` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-transcript-streaming.js` | `5663e744d331b57491eabd0cc3f2954370a53df7` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-transcript-turn-composition.js` | `6c92c0c66dcca2f3b59efe45908648153eb07830` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/test-vela-verified-trajectory.js` | `87e83e69e47a2c68275c8f895d1582aea485e6ba` | 测试源码 | run-all-tests/单独node命令（发现规则待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |
| `scripts/velaNodeRuntime.js` | `188fb983bc73861af8ee99af554ec9ee607161da` | 检查/runner工具 | CLI/测试依赖（具体接线待审） | 验证工具 | 仅列入清单；尚待审阅 | 清单枚举 | 未逐项判定 | 未审/未执行 | Node；部分浏览器/Host替身，具体待审 | 完整分支/消费者/实机尚待审阅 |

## 新增材料边界

R1指导书、54项JSON、audit-baseline-0.3.11下12份材料（manifest含11项）及1份局部归档.gitignore、本报告及A0报告共17个新增未跟踪文件；导入/哈希与zip内部索引见A0报告。它们不是388基线中的新生产源码，后续正式提交后需要以新commit刷新覆盖快照。

## G：本版源码差异覆盖增量（2026-09-13）

本节追加于A0历史388文件快照之后，不改历史blob/审阅数。范围为 `b93d0d8` → 合并基线 `17e1b67` 加G工作树：**33个生产文件、60个scripts文件**（含新Remove suite）。没有生成新全仓hash；原始54项及25项当前映射见 [G综合报告](vela-0.3.12-integrated-acceptance.md)。

下表明确区分：B1–F局部源码审阅为 **reused**；G当前suite执行为 **198/198 PASS、0 skip**；当前CEP/Provider/AE结果按报告分级。加载/执行通过不等于整文件源码审计完成。G完整追踪的是Remove新增恢复预检与相关写入链，其他文件只核对受影响入口/交界；未全审分支保留owner与里程碑。没有把COV-03–06关闭。

| 生产文件 | 原ID/owner范围 | 源码审阅/方法 | G验证及继承证据 | 剩余覆盖/完成点 |
|---|---|---|---|---|
| `client/css/velaSurface.css` | UX-03、AP/UX | E/F文案/样式审阅reused；G真实Review两步骤内容/可达性 | i18n freshness、readable Review78；F中英宽窄reused | 不是全局视觉重构/全部DPI验收；UI owner /0.3.13–14 |
| `client/js/appearance/appearanceResolver.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/appearance/appearanceStateStore.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/designTuning/designTuningResolver.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/designTuning/designTuningStateStore.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/i18n.js` | UX-03、AP/UX | E/F文案/样式审阅reused；G真实Review两步骤内容/可达性 | i18n freshness、readable Review78；F中英宽窄reused | 不是全局视觉重构/全部DPI验收；UI owner /0.3.13–14 |
| `client/js/main.js` | A05/A06/A12、AP/UX、UX-03 | D/E/F接线审阅reused；G后台Owner＋Settings＋真实Review入口核对 | source routing、settings、lifecycle、assets、readable review；实际UI | 自然短窗口/全main逐行审阅未完成；Composition/UI owner /0.3.13–17 |
| `client/js/palette/paletteStore.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/proceduralPaletteStore.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/proceduralPaletteWorkspace.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/system/systemSurfaceRouter.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/ui/coreUi.js` | AP-01–03/UX-01–02 | E保存/所有权/离开链审阅reused；G实际消费链局部复核 | E190及相关UI/store suite；当前CEP隔离storage26；真实Palette/Settings | 其余overlay/IME/异步storage分支未全审；UI/Store owner /0.3.13–14 |
| `client/js/vela/velaAgentDriver.js` | A02/A03/A06、UX-03 | C2/D/F目标关联/事实/停止/Review局部审阅reused；G交界复核 | execution facts597、D lifecycle208、Review78；CEP六个在途组合及真实链 | 晚到/unknown用受控边界；Runtime owner /0.3.17、0.3.25 |
| `client/js/vela/velaAgentRuntime.js` | A04、A02/A03、A06 | C1/C2/D事件与事实消费审阅reused；G Session/trajectory观测 | Session279、execution facts597、D受控CEP；真实Provider执行 | 持久历史、其余消费者全分支；Session owner /0.3.16–17、0.3.23 |
| `client/js/vela/velaAgentRuntimeOwner.js` | A02/A03/A06、UX-03 | C2/D/F目标关联/事实/停止/Review局部审阅reused；G交界复核 | execution facts597、D lifecycle208、Review78；CEP六个在途组合及真实链 | 晚到/unknown用受控边界；Runtime owner /0.3.17、0.3.25 |
| `client/js/vela/velaAtomicActivationCoordinator.js` | A04/A05/A06/A12 | D唯一holder/Authority后发布审阅reused；G当前组合调用核对 | D当前CEP162、C1/C2回归；后台selectedB/holderA真实UI | 自然在途UIDisable/所有分支未全审；Composition/Authority owner /0.3.13–17 |
| `client/js/vela/velaCapabilityContracts.js` | G-02、UX-03 | G-02合法名称/UTF-8预算审阅reused；F显示不改参数 | capability contracts、Unicode、readable Review；G完整回归 | 不扩展能力/名称预算；Capability owner /0.3.15 |
| `client/js/vela/velaConfirmationView.js` | UX-03、A05/A12 | F当前objective及兼容Review来源审阅reused；G source/UI/lifecycle接口核对 | Review78、Surface239等；真实两个Review、CEP同实例10 | 兼容入口与自然UI生命周期仍有限；Surface/Review owner /0.3.13–14、0.3.17 |
| `client/js/vela/velaConfirmedAuthorityComposer.js` | A04/A05/A06/A12 | D唯一holder/Authority后发布审阅reused；G当前组合调用核对 | D当前CEP162、C1/C2回归；后台selectedB/holderA真实UI | 自然在途UIDisable/所有分支未全审；Composition/Authority owner /0.3.13–17 |
| `client/js/vela/velaController.js` | UX-03、A05/A12 | F当前objective及兼容Review来源审阅reused；G source/UI/lifecycle接口核对 | Review78、Surface239等；真实两个Review、CEP同实例10 | 兼容入口与自然UI生命周期仍有限；Surface/Review owner /0.3.13–14、0.3.17 |
| `client/js/vela/velaConversationComposition.js` | A04/A05/A06/A12 | D唯一holder/Authority后发布审阅reused；G当前组合调用核对 | D当前CEP162、C1/C2回归；后台selectedB/holderA真实UI | 自然在途UIDisable/所有分支未全审；Composition/Authority owner /0.3.13–17 |
| `client/js/vela/velaConversationOwnership.js` | A04/A05/A06/A12 | D唯一holder/Authority后发布审阅reused；G当前组合调用核对 | D当前CEP162、C1/C2回归；后台selectedB/holderA真实UI | 自然在途UIDisable/所有分支未全审；Composition/Authority owner /0.3.13–17 |
| `client/js/vela/velaExecutionAdapter.js` | A02/A03/A06、UX-03 | C2/D/F目标关联/事实/停止/Review局部审阅reused；G交界复核 | execution facts597、D lifecycle208、Review78；CEP六个在途组合及真实链 | 晚到/unknown用受控边界；Runtime owner /0.3.17、0.3.25 |
| `client/js/vela/velaExecutionPreflight.js` | A02/A03/A06、UX-03 | C2/D/F目标关联/事实/停止/Review局部审阅reused；G交界复核 | execution facts597、D lifecycle208、Review78；CEP六个在途组合及真实链 | 晚到/unknown用受控边界；Runtime owner /0.3.17、0.3.25 |
| `client/js/vela/velaProviderAdapter.js` | A07/A12 | D终态/失效审阅reused；G截止计时/请求分支/流终态读取 | stream lifecycle/monotonicity/publication、D；G真实3次正常流 | 实际token/偶发延迟原因未知；Provider owner /0.3.16、0.3.25 |
| `client/js/vela/velaProviderStreamAssembler.js` | A07/A12 | D终态/失效审阅reused；G截止计时/请求分支/流终态读取 | stream lifecycle/monotonicity/publication、D；G真实3次正常流 | 实际token/偶发延迟原因未知；Provider owner /0.3.16、0.3.25 |
| `client/js/vela/velaReviewRuntimePort.js` | UX-03、A05/A12 | F当前objective及兼容Review来源审阅reused；G source/UI/lifecycle接口核对 | Review78、Surface239等；真实两个Review、CEP同实例10 | 兼容入口与自然UI生命周期仍有限；Surface/Review owner /0.3.13–14、0.3.17 |
| `client/js/vela/velaRuntime.js` | A02/A03/A06、UX-03 | C2/D/F目标关联/事实/停止/Review局部审阅reused；G交界复核 | execution facts597、D lifecycle208、Review78；CEP六个在途组合及真实链 | 晚到/unknown用受控边界；Runtime owner /0.3.17、0.3.25 |
| `client/js/vela/velaSessionRuntime.js` | A04、A02/A03、A06 | C1/C2/D事件与事实消费审阅reused；G Session/trajectory观测 | Session279、execution facts597、D受控CEP；真实Provider执行 | 持久历史、其余消费者全分支；Session owner /0.3.16–17、0.3.23 |
| `client/js/vela/velaSurfaceController.js` | UX-03、A05/A12 | F当前objective及兼容Review来源审阅reused；G source/UI/lifecycle接口核对 | Review78、Surface239等；真实两个Review、CEP同实例10 | 兼容入口与自然UI生命周期仍有限；Surface/Review owner /0.3.13–14、0.3.17 |
| `host/index.jsx` | A01/A11 | B1严格JSON入口/序列化审阅reused；G当前完整Host装载 | Host JSON入口/成员名/serialization、registry；当前AE正常返回 | 无JSON.parse/特殊键自然环境；Host owner /0.3.25 |
| `host/tools/adComponentKit.jsx` | A08/A09、G Remove | B2几何/定稿局部审阅reused；G完整Remove恢复读→预检→写/删调用链复核 | Detach三suite、Feature/Grid/measurement；新Remove85；AE Grid/Feature Remove及4次Undo | 未改其他工具分支；Detach注册/UI与26.3；Host owner /0.3.18–22 |
| `host/tools/textBackgroundBox.jsx` | A09 | M2/F1身份与转换审阅reused；G关联检查 | TBB coordinate/identity完整生产Host fixture；原AE证据reused | AVfallback/其他版本自然条件；Host owner /0.3.18–21 |

以下60个测试/fixture/采集与生成脚本分别列出。`test-*.js`由原runner在当前全量实际执行；fixtures随消费者加载，不计独立suite；诊断/采集器不是产品入口，其历史使用不能算本次重新运行。源码未全审的测试/helper分支由测试/CI owner在后续变更及0.3.25–26完成。其他未变更文件仍按A0/各阶段既有覆盖记录，不自行升级。

| scripts文件 | 实际角色与G证据 | 审阅边界/后续 |
|---|---|---|
| `scripts/capture-a08-detach.js` | 历史A08采集器；G未运行本文件，有限Host采集用本地脚本 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/diagnostics/velaLayerNameUnicodeCases.js` | 既有Unicode案例集，由名称/Host相关消费者使用 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/ad-component-detach-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/extendscript-logical-returns.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/feature-expression-contract.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/host-json-entry-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/tbb-coordinate-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/vela-execution-facts-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/vela-provider-lifecycle-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/vela-review-read-equivalence.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/fixtures/vela-trajectory-harness.js` | 既有生产组合fixture，由相关正式suite加载；不是实际AE/Provider | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/report-i18n-usage.js` | 原生成脚本freshness检查执行；不手工生成报告 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-ad-component-coordinate-measurement.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-ad-component-detach-finalize.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-ad-component-detach-locator.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-ad-component-detach.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-appearance-runtime-stability.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-button-variant-provenance.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-calibration-authority-convergence.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-calibration-consumer-gaps.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-core-ui-bezier-curve-field.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-design-tuning-infrastructure.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-feature-dynamic-geometry.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-generated-report-guard.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-host-json-entry.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-host-json-member-admission.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-host-json-serialization.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-palette-workspace-continuity.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-primary-text-palette-assignment.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-shared-select-lifecycle.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-tbb-coordinate-safety.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-tbb-identity-safety.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-typography-appearance-foundation.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-user-assets-exit-safety.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-agent-driver.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-agent-production-lifecycle.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-agent-runtime-owner.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-agent-runtime.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-capability-contracts.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-context-selection.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-conversation-ownership.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-execution-facts-verification.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-observation-turn-isolation.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-production-e2e.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-stream-assembler.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-stream-lifecycle.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-stream-publication.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-task-lifecycle.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-provider-terminal-monotonicity.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-readable-review.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-review-runtime-seam.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-runtime.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-session-runtime.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-settings-integration.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-source-bound-routing.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-spacing-authority.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-surface-bootstrap-boundary.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-surface-controller.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-vela-verified-trajectory.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | B1–F变更证据reused；G执行/依赖映射，不宣称全部测试源码深审 |
| `scripts/test-ad-component-remove-recovery.js` | 当前198个suite中的正式测试；生产模块/受控边界依该suite声明 | G新增反例与恢复失败边界逐项复核；85断言PASS |

文档、历史证据JSON/归档与当前入口变化不算新增生产源码；其角色由A0导入记录和各阶段报告持有。当前G仅更新既有报告/总账/覆盖入口及一份综合报告，不递归重核历史raw。CI workflow/runner的发现与隔离规则未由G修改；已合并PR的成功CI与G本地198/198、未来G PR CI三者分开。
