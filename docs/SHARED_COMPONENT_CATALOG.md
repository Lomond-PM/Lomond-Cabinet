# Shared UI Component Catalog

本目录记录 Lomond Cabinet 0.3.2 当前正式可复用的 Shared UI / CoreUI 与 Registry Renderer component family。它以实际 creation path 为准，不把 feature-private DOM、纯布局容器或测试 fixture 当成共享组件。

Registry Renderer 的固定规则是：**Registry Renderer composes shared UI components; it does not create independent visual or interactive primitives.** 新增 Registry UI 时，应依次检查现有 component、variant 与 composite；只有存在已证明的跨 consumer 能力缺口时，才审计新增 shared capability。

## Shared Component Catalog

| Component ID / API | 中文名称 | English Name | Component Type | 主要用途 | Variants | Semantic Authorities | Control Lab Coverage | Registry Renderer Usage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CoreUI.createTextInput()` | 单行文本输入 | Text Input | Field / Primitive | 提供标准单行文本编辑、输入/提交事件及 Field presentation。 | text；consumer class | Field Surface、Field Border、Text、Focus | FULL | DIRECT | Registry `text` / path-like text fields 直接消费。 |
| `CoreUI.createTextarea()` | 多行文本编辑区 | Textarea | Field / Composite | 提供多行编辑、共享滚动框架与可选项目自有 resize grip。 | vertical / horizontal / both / none | Field Surface、Field Border、Scrollbar、Focus | FULL | DIRECT | Registry `textarea` 使用返回的 `_coreFrame`。 |
| `CoreUI.createNumberInput()` | 可拖拽数值输入 | Number Input | Field / Primitive | 组合精确键盘输入、水平 scrub、范围归一化与 commit/cancel。 | bounded / unbounded；drag；readonly/disabled consumer state | Field Surface、Field Border、Control Text、Focus | FULL | DIRECT | Registry `number` 继续由 schema 提供 bounds。 |
| `CoreUI.createRangeNumber()` | 数值与滑块组合控件 | Range Number | Field / Composite | 将数值输入、可选单位和范围滑块组合成同一数值编辑器。 | unit / no-unit；presentation adapter；track bounds | Field、Slider Track、Thumb Optics、Focus | FULL | DIRECT | Registry `range`、Settings、Design Tuning、Color Alpha 共用。 |
| `CoreUI.createSelect()` | 原生选择值基座 | Select Base | Selection / Platform Boundary | 创建保留 native value/change authority 的基础 `select`。 | enabled / disabled；native fallback | Field Surface、Field Border、Text | FULL | DIRECT | 正式视觉路径继续由 `enhanceSelect()` 完成；native popup仅为明确 fallback。 |
| `CoreUI.enhanceSelect()` | 门户式选择器适配器 | Custom Select Adapter | Selection / Layout-aware Composite | 将已挂载 native Select 主动升级为 app-owned trigger、body portal 与菜单生命周期。 | custom portal；native fallback boundary | Select Trigger Surface、Select Menu Surface、Floating Elevation、Focus | PARTIAL | DIRECT | Lab覆盖真实 Select；disabled、dispose/remount 等完整 lifecycle 另由 focused test 与 AE acceptance验证。 |
| `CoreUI.createSwitch()` | 即时开关 | Switch | Selection / Primitive | 表达立即生效的持久开/关状态，保留 native checkbox authority。 | label-root / slot-root；disabled | Switch Track、Accent、Thumb Optics、Focus | FULL | DIRECT | Registry `switch` 与 section toggle 共用。 |
| `CoreUI.createCheckbox()` | 复选确认框 | Checkbox | Selection / Primitive | 表达选择、确认或成员关系，与 Switch 保持语义区分。 | with / without label text；disabled | Field、Accent、Focus | FULL | DIRECT | Registry `checkbox` 与 Vela acknowledgement 共用。 |
| `CoreUI.createChoiceGroup()` | 卡片式单选组 | Choice Group | Selection / Composite | 提供 radiogroup、roving focus、Arrow/Home/End 与 option disabled。 | card option；group disabled；option disabled | Registry Option Surface、Field Border、Accent、Focus | FULL | DIRECT | Registry schema 兼容名为 `tabs`。 |
| `CoreUI.createBezierCurveField()` | 贝塞尔曲线编辑器 | Bezier Curve Field | Specialized Editor | 编辑结构化 cubic-bezier，提供 Progress/Speed 视图、拖拽、键盘及数值输入。 | progress / speed；readonly；disabled | Field Surface、Field Border、Text、Focus | FULL | DIRECT | Registry `cubicBezier` 直接消费；真实内容不依赖 Motion domain。 |
| `CoreUI.createDisclosureController()` | 折叠区控制器 | Disclosure Controller | Navigation / Composite | 统一 trigger/content association、expanded state 与 ARIA。 | expanded / collapsed | Interaction、Focus；视觉由 consumer拥有 | FULL | DIRECT | Registry section 与 Settings category 共用。 |
| `CoreUI.createButton()` | 语义操作按钮 | Button | Action / Primitive | 提供统一 button primitive、语义 variant 与独立 size variant。 | Neutral、Primary、Danger、Utility、Navigation；Standard、Compact | Action Surfaces、Borders、Foregrounds、Elevations、Focus | PARTIAL | DIRECT | Lab覆盖五种视觉角色；Compact 由 Settings/Design Tuning contract验证。Navigation是Utility family子变体。 |
| `CoreUI.createColorField()` | 色值编辑器 | Color Field | Field / Composite | 组合 swatch、canonical value、HEX 输入与 app-level picker seam。 | six-digit color；Color + Alpha | Field Surface、Field Border、Focus、Color presentation | FULL | DIRECT | Registry `color` 与 direct Color + Alpha specimen 均覆盖。 |
| `CoreUI.createShadowField()` | 结构化阴影编辑器 | Shadow Field | Specialized Editor | 以 X/Y、Blur、Spread、Color、Opacity 编辑有限且可验证的单层阴影。 | finite single-layer shadow | Field、ColorField、NumberInput | FULL | DIRECT | Control Lab direct specimen；Registry暂无普通 schema `shadow` type。 |
| `CoreUI.createFieldRow()` | 字段行 | Field Row | Layout-aware Composite | 统一 row、label、description 与 control region 的布局、growth 和关联。 | aligned consumer layout；label association；contentGrowth | Field Label、Supporting Text、Domain Spacing | FULL | DIRECT | 所有 Registry 正式 field family 由 renderer 调用该 factory。 |
| `.ui-scroll-region` / `.ui-editable-scroll` | 共享滚动区域 | Shared Scroll Region | Platform Boundary | 统一应用滚动条外观；滚动 ownership 与 overflow geometry 仍由 consumer决定。 | surface scroll / editable scroll | Global Scrollbar Contract | N/A | NOT FOR REGISTRY | 不是 Registry schema component；Tool Detail/Settings/Palette/Vela 在各自 surface 使用。 |
| `openCoreColorPicker()` → `openRegistryColorPicker()` | 应用级颜色选择器 | App Color Picker | Specialized Editor | 提供 HSV/RGB plane、axis、channels、eyedropper、HEX 与 portal cleanup。 | HSV axis / RGB axis；eyedropper | Floating Picker Elevation、Field、Focus | FULL | COMPOSITE ONLY | ColorField 注入真实 picker seam；channel ranges 是登记的 specialized internal primitive。 |
| `renderSchemaField()` | Registry 字段渲染器 | Registry Field Renderer | Composite | 将 declarative field schema 映射到 FieldRow 与正式 shared controls。 | schema field families | 由所组合 component决定 | PARTIAL | SPECIAL CASE | 除 `proceduralPreview` 的明确 Lab exemption 外，所有正式 renderer type 均有 Lab path。 |
| `renderToolSection()` | Registry 分区 | Registry Section | Composite | 组合 section heading、description、toggle、disclosure、field body 与 action stack。 | collapsible；toggleable；actionStack | Panel Surface、Section Radius、Spacing | FULL | SPECIAL CASE | Registry-specific semantic composite，不迁入 CoreUI。 |
| `type: "subheading"` | Registry 字段组标题 | Registry Subheading | Composite | 在 section body 内建立字段子组层级，不产生交互 primitive。 | standard | Section Title Typography | FULL | SPECIAL CASE | Renderer-owned semantic text composite。 |
| `type: "info" / "note"` | Registry 说明提示 | Registry Info / Note | Composite | 展示只读说明或帮助文本，不获得 editable behavior。 | info / note | Field-like/Information presentation、Supporting Text | FULL | SPECIAL CASE | 不建立独立 Description/Helper authority。 |
| `type: "divider" / "separator"` | Registry 分隔线 | Registry Divider | Composite | 在字段流中表达内容分组边界。 | divider / separator compatibility | Separator Border | FULL | SPECIAL CASE | 无独立 focus、surface 或行为。 |
| `type: "button" / "actionButton"` | Registry 行内操作 | Registry Action Field | Composite | 将 schema action metadata、state condition 与 shared Button primitive组合。 | Neutral、Primary、Danger；bilingual/full-width composition | Shared Button authorities | FULL | SPECIAL CASE | Schema `secondary` 映射为 Neutral；不创建本地按钮 primitive。 |
| `renderToolActions()` | Registry 工具级操作区 | Registry Tool Actions | Composite | 组合 Restore Defaults 与工具级 primary/secondary actions。 | Neutral / Primary | Shared Button authorities、Action Container | FULL | SPECIAL CASE | Registry负责 action routing，Button负责 primitive presentation。 |
| `renderRegistryStateCard()` | Registry 状态卡 | Registry State Card | Status / Composite | 将 Host runtime state 映射为只读状态摘要。 | idle / ready / error | Information Surface、Status Tone、Text | FULL | SPECIAL CASE | 不获得 Field editing behavior。 |
| `type: "proceduralPreview"` | 程序化预览 | Procedural Preview | Specialized Editor / Composite | 承载 domain-bound canvas preview、fallback status 与元数据。 | icon / background presentation | Preview Prominence、Panel/Field text | N/A | SPECIAL CASE | Registry Control Lab 明确豁免；由 Procedural Appearance Lab/runtime验证。 |

### Catalog statistics

统计方法：表格每个数据行计一个 component/family；`Control Lab Coverage` 与 `Registry Renderer Usage` 按列值直接分组，不将标题或说明行计入。

- Total component / family count: **26**
- Control Lab Coverage: **FULL 21 / PARTIAL 3 / N/A 2**
- Registry Renderer Usage: **DIRECT 15 / COMPOSITE ONLY 1 / SPECIAL CASE 9 / NOT FOR REGISTRY 1**

## Final Registry Component Provenance Map

| Registry Consumer | Creation Path | Visual / Interactive Role | Provenance | Shared API / Variant | Control Lab Coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Formal field shell | schema field → `renderSchemaField()` → factory | row / label / description / control geometry | SHARED COMPONENT | `CoreUI.createFieldRow()` | FULL | Registry只保留schema binding与conditions。 |
| Text field | `type:text` → renderer → factory | editable text | SHARED COMPONENT | `createTextInput()` | FULL | path-like text沿同一路径。 |
| Textarea | `type:textarea` → renderer → factory | multiline editable surface | SHARED COMPONENT | `createTextarea()` | FULL | shared frame/resize seam。 |
| Number field | `type:number` → renderer → factory | precise input + scrub | SHARED COMPONENT | `createNumberInput()` | FULL | bounds来自schema。 |
| Range field | `type:range` → renderer → factory | number/unit + slider | SHARED COMPONENT | `createRangeNumber()` | FULL | Registry不重建内部拓扑。 |
| Select base | `type:select` → renderer → factory | native value/change authority | SHARED COMPONENT | `createSelect()` | FULL | `<option>` 是native boundary。 |
| Select presentation | mounted Select → active adapter | trigger / portal / keyboard / lifecycle | SHARED COMPONENT | `enhanceSelect()` | PARTIAL | document-wide late scan已退休。 |
| Switch | `type:switch` → renderer → factory | immediate boolean toggle | SHARED COMPONENT | `createSwitch()` | FULL | 与Checkbox语义分离。 |
| Checkbox | `type:checkbox` → renderer → factory | acknowledgement/selection | SHARED COMPONENT | `createCheckbox()` | FULL | native input仍是authority。 |
| Tabs | `type:tabs` → renderer → factory | card-style single selection | SHARED COMPONENT | `createChoiceGroup()` | FULL | schema兼容名保留。 |
| Color | `type:color` → renderer → factory | swatch + HEX + picker seam | SHARED COMPONENT | `createColorField()` | FULL | picker由app-level infrastructure拥有。 |
| Bezier | `type:cubicBezier` → renderer → factory | structured curve editor | SHARED COMPONENT | `createBezierCurveField()` | FULL | growth由FieldRow接收。 |
| Shadow direct specimen | Control Lab metadata → direct factory | structured shadow editor | SHARED COMPONENT | `createShadowField()` | FULL | 不是普通Registry schema type。 |
| Color + Alpha specimen | Control Lab direct mode → ColorField | alpha-bearing color editor | SHARED VARIANT | `createColorField({supportsAlpha:true})` | FULL | 不建立第二个Color component。 |
| Section disclosure | section schema → `renderToolSection()` | collapsible heading/body | COMPOSITE | shared Button + `createDisclosureController()` | FULL | Registry拥有section meaning/layout。 |
| Section enable toggle | section `toggleKey` → helper | persistent section enablement | COMPOSITE | `createSwitch()` | FULL | wrapper只负责section wiring。 |
| Registry section | section schema → renderer | card/heading/body/action composition | COMPOSITE | `renderToolSection()` | FULL | Registry-specific composite。 |
| Action Field | action field schema → renderer | inline action composition | COMPOSITE | `createButton()` | FULL | routing/state由Registry拥有。 |
| Action Field primitive | Action Field → Button | action presentation | SHARED VARIANT | Neutral / Primary / Danger | FULL | `secondary`兼容映射Neutral。 |
| Tool Actions | tool actions → renderer | restore + global actions | COMPOSITE | `renderToolActions()` | FULL | Tool/Host action routing不进入Button。 |
| Tool Action primitive | Tool Actions → Button | action presentation | SHARED VARIANT | Neutral / Primary | FULL | 无raw button。 |
| Utility / Navigation specimen | Control Lab direct metadata | shared semantic variants | SHARED VARIANT | Utility / Navigation | FULL | Navigation共享Utility presentation authority。 |
| Subheading | field schema → renderer text composite | semantic subheading | COMPOSITE | Registry Subheading | FULL | 非interactive。 |
| Info / Note | field schema → renderer text composite | read-only help | COMPOSITE | Registry Info / Note | FULL | 非editable。 |
| Divider | field schema → renderer boundary | section flow separator | COMPOSITE | Registry Divider | FULL | 仅语义边界。 |
| State Card | state schema → renderer | read-only runtime status | COMPOSITE | Registry State Card | FULL | Host state非持久。 |
| Procedural Preview | field schema → renderer/runtime | canvas preview composite | COMPOSITE | Procedural Preview | N/A | Control Lab明确豁免。 |
| Control/layout wrappers | renderer → `div/span/section` | grouping/flow/slots | STRUCTURAL WRAPPER | none | FULL | 无独立视觉或交互identity。 |
| Copy/text-pair wrappers | renderer → `span` | bilingual/copy grouping | STRUCTURAL WRAPPER | none | FULL | 不拥有surface、border或state。 |
| Native options | Select schema → `<option>` | browser value option | APPROVED PLATFORM / NATIVE BOUNDARY | native Select | FULL | custom popup的value authority仍来自native control。 |
| Color channel sliders | picker → `createChannelSliders()` | compact H/S/V/R/G/B channels | SPECIALIZED INTERNAL PRIMITIVE | raw `input[type=range]` | FULL | 精确到该function的已测试例外。 |
| Color plane/axis canvases | picker → canvas/handles | specialized color geometry | SPECIALIZED INTERNAL PRIMITIVE | canvas + noninteractive handles | FULL | 不是通用Registry control。 |
| Picker buttons / HEX | picker → shared factories | axis、eyedropper、HEX edit | SHARED COMPONENT | Button + TextInput | FULL | 已移除本地raw button/text input。 |

Provenance map counts（按上表逐行分组）：

- SHARED COMPONENT: **14**
- SHARED VARIANT: **4**
- COMPOSITE: **10**
- STRUCTURAL WRAPPER: **2**
- APPROVED PLATFORM / NATIVE BOUNDARY: **1**
- SPECIALIZED INTERNAL PRIMITIVE: **2**
- LOCAL-UNREGISTERED: **0**

## Final Raw Primitive Creation Map

| File / Function | Primitive | Consumer | Classification | Allowed? | Formal Owner / Reason |
| --- | --- | --- | --- | --- | --- |
| `client/js/ui/coreUi.js` / component factories | `input`, `textarea`, `select`, `button`, `span`, SVG | Shared UI families | SHARED COMPONENT INTERNAL | Yes | Raw DOM is inside the formal shared implementation. |
| `renderSchemaField()` / formal fields | `span` control slot | FieldRow control region | STRUCTURAL WRAPPER | Yes | Layout slot only；FieldRow owns formal row/copy geometry。 |
| `renderSchemaField()` / Select | `option` | native Select values | APPROVED PLATFORM / NATIVE BOUNDARY | Yes | Required native value/change authority and fallback. |
| `renderSchemaField()` / `proceduralPreview` | `canvas` | procedural preview | SPECIALIZED INTERNAL PRIMITIVE | Yes | Domain-bound raster preview；not an interactive input primitive。 |
| `renderSchemaField()` / semantic composites | `div`, `h4`, `code`, `small`, `span` | info、note、divider、subheading、preview copy | STRUCTURAL / COMPOSITE DOM | Yes | Exact schema composites；no duplicate editable primitive。 |
| `renderToolSection()` | `section`, `div`, heading/text spans | Registry section | STRUCTURAL WRAPPER | Yes | Grouping, slots and flow only；interactive trigger comes from CoreUI Button。 |
| `renderRegistryStateCard()` | `section`, text rows | state summary | COMPOSITE DOM | Yes | Read-only Registry status composite。 |
| `openRegistryColorPicker()` / `createChannelSliders()` | `input[type=range]` | H/S/V/R/G/B channels | SPECIALIZED INTERNAL PRIMITIVE | Yes | Specific compact Color Picker editor exception protected by provenance gate。 |
| `openRegistryColorPicker()` | `canvas`, noninteractive handles | color plane / axis | SPECIALIZED INTERNAL PRIMITIVE | Yes | Specialized geometry；not reusable form controls。 |
| `openRegistryColorPicker()` | axis/eyedropper buttons、HEX input | picker controls | SHARED COMPONENT | Yes | Created through `CoreUI.createButton()` / `createTextInput()`。 |
| `proceduralPaletteWorkspace.js` / tool mapping | raw `select` fallback | Palette mapping | APPROVED PLATFORM / NATIVE BOUNDARY | Yes | Only when CoreUI is unavailable；normal production path uses CoreUI and active enhancement。 |
| `proceduralPaletteWorkspace.js` / tool mapping | `option` | Palette values | APPROVED PLATFORM / NATIVE BOUNDARY | Yes | Native Select value source。 |

Registry presentation-layer visual/interactive primitives therefore finish at **LOCAL-UNREGISTERED = 0**. Exceptions are function-specific, documented and covered; no directory-wide bypass exists.

## Control Lab role and coverage

Registry Control Lab is a **Shared Component Test Consumer**, never the source of truth. Production API and semantic authorities remain in CoreUI/CSS; Lab metadata only requests real renderer paths or direct specimens.

- Registry Path covers text, textarea, number, range, select, checkbox, switch, tabs, color, button/actionButton, divider/separator, info/note, subheading and cubicBezier.
- CoreUI Direct covers FieldRow, Select enhancement, Button variants, ShadowField and ColorField alpha mode.
- Procedural Preview remains the single explicit Registry Control Lab exemption and is validated through Procedural Appearance runtime/AE acceptance.
- `PARTIAL` is retained for Custom Select lifecycle, Button compact size and the aggregate Registry Field Renderer; those missing Lab-only dimensions are protected by focused contracts and real product consumers rather than fixture-only UI.

## Approved boundaries

### Structural Wrapper

A structural wrapper has no independent surface, border/chrome, focus/hover/pressed lifecycle, editable behavior or reusable visual identity. It may own layout, grouping, slots, measurement and flow only.

### Approved Platform / Native Boundary

Native Select/options may remain as value authority, accessibility/platform fallback or unsupported-environment fallback. The normal product visual path remains the shared Custom Select adapter.

### Specialized Internal Primitive

A specialized internal primitive is allowed only inside a named editor with a finite, tested purpose, such as Color Picker channel ranges and canvas geometry. “Registry internal” is not a valid general exception.

## Registry Primitive Provenance Gate

`scripts/test-registry-primitive-provenance.js` prevents Registry rendering scopes from introducing raw button, text input, range, select, checkbox or textarea primitives outside the enumerated boundaries. Any future exception must identify the exact file, function, consumer and reason; directory-wide allowlists are prohibited.

## AE acceptance

Real AE/CEP product-path acceptance is **PASS** for Registry fields, Select mouse/keyboard interaction, Settings Select, Palette Select, Switch, Checkbox, ChoiceGroup, Color, Shadow, Bezier, Registry/Tool Actions, rerender, popup cleanup, UI Scale `0.62` and narrow layout. Node fake DOM tests are automated lifecycle evidence only and are not presented as AE evidence.

No unintended visual or behavioral delta was observed in AE acceptance. This phase is architecture convergence, not redesign.
