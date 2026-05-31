# MindDesign 功能增强实施方案

> 基于 Open Design (nexu-io/open-design) 的优秀实践，结合 MindDesign 自身定位（桌面端 AI 画布设计工具）制定的本地方案。

---

## 一、设计系统库扩展

### 现状

MindDesign 已有 14 个内置设计规范（Stripe、Linear、Apple、Vercel、Notion、Airbnb、Spotify、Nike、Figma、Supabase、Cursor、Framer、Tesla + 自定义导入），每个规范包含：配色方案、字体栈、圆角规范、风格提示词（styleHint）、完整 Prompt。

### 目标

扩展到 50+ 设计系统，覆盖主流产品品牌，按分类组织，支持用户自定义扩展。

### 方案

#### 1.1 设计系统数据结构升级

```
DesignSpec 新增字段：
- tags: string[]          // 标签（fintech, saas, consumer, editorial...）
- industry: string        // 行业分类
- mood: string[]          // 情绪关键词（professional, playful, bold, minimal...）
- darkMode: ColorSet      // 深色模式配色
- lightMode: ColorSet     // 浅色模式配色（现有 colors 升级）
- spacing: 'tight'|'normal'|'spacious'  // 间距风格
- density: 'compact'|'normal'|'airy'    // 信息密度
```

#### 1.2 分类体系

```
内置设计规范按场景分组：

SaaS / 开发者工具
  - Linear, Vercel, Supabase, Cursor, Figma, Framer, Notion

金融 / 商业
  - Stripe, Tesla

消费 / 生活方式
  - Airbnb, Spotify, Nike, Apple

新增分类（从 Open Design 的 awesome-design-md 参考提取）：
  - 社交媒体: 小红书, Twitter/X, Instagram, Discord, WeChat
  - 电商: Shopify, Amazon, 淘宝, SHEIN
  - 医疗健康: Mayo Clinic, 平安好医生
  - 教育培训: Coursera, Duolingo, 得到
  - AI / 科技: OpenAI, Anthropic, Google DeepMind, Midjourney
  - 媒体出版: The Verge, Monocle, 彭博社
  - 出行旅游: 携程, Uber, Airbnb(已有)
  - 餐饮美食: 美团, DoorDash, Starbucks
```

#### 1.3 设计系统模板生成器

```
新增功能：用户可以输入品牌 URL 或上传 Logo，
AI 自动分析品牌视觉语言并生成 DesignSpec。
流程：
1. 用户输入品牌 URL 或上传品牌素材
2. AI 提取主色、辅助色、字体风格、圆角等视觉特征
3. 生成标准 DesignSpec 对象
4. 用户可微调后保存为自定义规范
```

#### 1.4 落地步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| Step 1 | 扩展 DesignSpec 类型定义，新增 tags/industry/mood/darkMode 等字段 | `prompts/designSpecs.ts` |
| Step 2 | 新增 20-30 个设计规范数据（从主流品牌提取） | `prompts/designSpecs.ts` |
| Step 3 | DesignSpecSelector 支持分类筛选和搜索 | `components/DesignSpecSelector.vue` |
| Step 4 | 新增品牌分析 Prompt，支持从 URL/Logo 生成规范 | 新增 `prompts/brandAnalyzer.ts` |
| Step 5 | 自定义设计规范持久化（存入项目文件） | `stores/canvasStore.ts` |

---

## 二、Prompt 工程体系

### 现状

MindDesign 的 Prompt 体系：
- `system.ts` — 主系统提示词（输出格式、核心规则、图标使用、页面类型约束、配色方案、技术规范）
- `designSpecs.ts` — 设计规范 Prompt（每个品牌一份 fullPrompt）
- `colors.ts` — 配色方案约束
- `page-types.ts` — 页面类型约束（app/web/desktop）
- `icons.ts` — 图标使用规范
- `examples.ts` — 示例（已内嵌到 system.ts）

Open Design 的 Prompt 体系特色：
- 31 个 Skill，每个 Skill 有独立 SKILL.md（mode, scenario, preview.type, design_system.requires 等）
- 5 个视觉方向（Editorial Monocle, Modern Minimal, Warm Soft, Tech Utility, Brutalist Experimental）
- 发现表单（Turn-1 discovery form）— 生成前先确认需求
- 5 维自评机制（5-dimensional self-critique）
- 品牌资产 5 步协议

### 方案

#### 2.1 场景化 Skill 体系

```
MindDesign Skill 结构（不需要照搬 OD 的 daemon 架构，保持前端轻量）：

interface DesignSkill {
  id: string
  name: string
  icon: string
  category: 'design' | 'marketing' | 'operation' | 'engineering' | 'product'
  description: string
  examplePrompt: string
  pageType: PageType | 'auto'
  designSpecRequired: boolean
  preflightPrompt: string   // 生成前确认的引导问题
  systemPromptAddons: string // 追加到系统提示词的额外约束
  qualityChecklist: string[] // 质量自检项
}

内置 Skill 列表：

design（设计）:
  - web-prototype     网页原型
  - mobile-app        移动端 App 界面
  - dashboard         数据仪表盘
  - landing-page      落地页
  - wireframe         线框图
  - design-critique   设计评审（对现有设计提改进建议）

marketing（营销）:
  - social-carousel   社交媒体轮播图
  - email-template    邮件模板
  - poster            海报/宣传图
  - magazine-page     杂志排版页

operation（运营）:
  - kanban-board      看板
  - data-report       数据报告
  - invoice           发据/收据

product（产品）:
  - prd-document      产品需求文档可视化
  - user-flow         用户流程图
  - competitor-analysis 竞品分析看板

engineering（工程）:
  - api-docs          API 文档页
  - status-page       系统状态页
  - changelog         更新日志页
```

#### 2.2 生成前需求确认（Preflight Form）

```
Open Design 的 discovery form 是个很好的实践。
MindDesign 可以在用户发送第一条消息时，
让 AI 先输出一个结构化的需求确认表单，而不是直接出图。

流程：
1. 用户输入 "帮我设计一个电商首页"
2. AI 不直接生成 HTML，而是输出一个确认表单：
   {
     "type": "preflight",
     "questions": [
       { "key": "target_audience", "label": "目标用户", "options": ["年轻女性", "家庭用户", "企业采购"] },
       { "key": "style", "label": "视觉风格", "options": ["简约现代", "活力潮流", "高端质感"] },
       { "key": "key_sections", "label": "核心模块", "options": ["轮播Banner", "秒杀专区", "商品推荐", "分类导航"] }
     ]
   }
3. 前端渲染为交互式表单
4. 用户选择后，AI 结合用户选择 + 设计规范生成精准的设计稿

这个机制大幅减少 "生成-否定-重生成" 的循环次数。
```

#### 2.3 设计质量自评（Self-Critique）

```
在 AI 生成 HTML 后，自动触发一轮自评。

自评维度（参考 Open Design 的 5 维评价）：
1. 视觉一致性 — 颜色、间距、字号是否遵循设计规范
2. 信息层级 — 标题、正文、辅助信息的层次是否清晰
3. 可用性 — 交互元素大小、间距是否合理（触控目标 >= 44px）
4. 品牌契合度 — 是否符合所选设计规范的品牌调性
5. 完整度 — 页面各区域是否完整，有无遗漏

实现方式：
- 在 system prompt 中追加自评指令
- AI 生成 HTML 后，紧跟着输出一段 JSON 格式的自评结果
- 前端解析后在 ChatPanel 中以卡片形式展示
- 用户可以点击 "根据建议优化" 让 AI 自动改进
```

#### 2.4 落地步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| Step 1 | 定义 DesignSkill 接口和内置 Skill 数据 | 新增 `prompts/skills.ts` |
| Step 2 | 在 HomeView 或 DesignView 中新增 Skill 选择器 | 新增 `components/SkillSelector.vue` |
| Step 3 | 实现 Preflight 表单协议（AI 输出 → 前端渲染 → 用户选择 → 注入 Prompt） | `ai/chat.ts`, 新增 `components/PreflightForm.vue` |
| Step 4 | 在 system prompt 中追加自评指令 | `prompts/system.ts` |
| Step 5 | ChatPanel 解析自评结果并渲染为卡片 | `components/ChatPanel.vue` |

---

## 三、设计规范流程

### 现状

MindDesign 的设计流程比较直接：用户选页面类型 → 选配色 → 选设计规范（可选）→ 聊天 → 出图。

### 目标

引入结构化的设计流程，让 AI 生成质量更稳定可控。

### 方案

#### 3.1 五步品牌资产协议（参考 Open Design）

```
当用户选择一个设计规范或提供品牌信息时，
自动生成一套品牌资产快照，作为后续所有生成的约束：

Step 1 — 品牌色彩提取
  - 主色 Primary
  - 辅助色 Secondary
  - 背景色 Background（浅色/深色）
  - 表面色 Surface
  - 文字色 Text / TextSecondary
  - 强调色 Accent
  - 功能色 Error / Success / Warning

Step 2 — 排版规范
  - 字体栈 Font Stack
  - 标题字号层级（H1-H6）
  - 正文字号
  - 行高和字间距
  - 字重使用规则

Step 3 — 间距系统
  - 基础间距单位（4px/8px）
  - 常用间距档位（xs/sm/md/lg/xl）
  - 组件内边距
  - 组件间距

Step 4 — 组件风格
  - 按钮形状（圆角/药丸/方形）
  - 卡片风格（阴影/边框/扁平）
  - 输入框样式
  - 导航模式

Step 5 — 布局原则
  - 内容最大宽度
  - 网格列数
  - 侧边栏宽度
  - Hero 区域比例

这套资产在用户选择设计规范后自动从 DesignSpec.fullPrompt 中提取，
以 JSON 格式注入到后续所有对话的 system prompt 中。
```

#### 3.2 视觉方向选择器（Direction Picker）

```
参考 Open Design 的 5 个视觉方向，MindDesign 新增：

当用户没有选择具体设计规范时，提供 5 个预设视觉方向：

1. Editorial Monocle（编辑风格）
   - OKLch 配色：暖白底、深墨标题、赤陶强调
   - 字体：衬线 + 无衬线混排
   - 特点：大量留白、编辑式排版、杂志感

2. Modern Minimal（现代极简）
   - OKLch 配色：纯白底、中灰文字、单一强调色
   - 字体：Inter / SF Pro
   - 特点：极致留白、大标题、极少装饰

3. Warm Soft（温暖柔和）
   - OKLch 配色：奶油底、棕褐文字、珊瑚强调
   - 字体：圆体
   - 特点：圆角、柔和阴影、友好亲切

4. Tech Utility（科技工具）
   - OKLch 配色：深色底、亮色文字、霓虹强调
   - 字体：等宽 + 无衬线
   - 特点：数据密度高、等宽数字、表格化

5. Brutalist Experimental（粗野实验）
   - OKLch 配色：黑底或纯色底、高对比
   - 字体：大号粗体
   - 特点：不对称布局、极端对比、实验性

实现：
- 在 HomeView 新增 "视觉方向" 选择卡片
- 选择后自动生成对应的配色和排版参数
- 注入到 system prompt 中
```

#### 3.3 落地步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| Step 1 | 定义 BrandAsset 接口，实现从 DesignSpec 自动提取 | 新增 `prompts/brandAssets.ts` |
| Step 2 | 定义 5 个视觉方向的数据和配色 | 新增 `prompts/directions.ts` |
| Step 3 | HomeView 新增视觉方向选择 | `views/HomeView.vue` |
| Step 4 | buildSystemPrompt 集成品牌资产和视觉方向 | `prompts/system.ts` |

---

## 四、多格式导出

### 现状

MindDesign 目前只支持 HTML 导出：
- 复制 HTML 代码
- 下载 .html 文件
- ExportDialog 提供预览和代码查看

### 目标

支持 HTML / PNG / PDF / ZIP 多格式导出。

### 方案

#### 4.1 PNG 图片导出

```
方案：利用项目已有的 html2canvas 依赖

实现：
1. 创建一个隐藏的 iframe，加载 HTML 内容
2. 等待渲染完成（包含字体加载、图片加载）
3. 使用 html2canvas 将 iframe 内容转为 Canvas
4. Canvas.toBlob() 生成 PNG
5. 触发下载

进阶：利用 leafer-in/export（项目已依赖）
- 可以直接从画布上的卡片截图导出
- 支持 1x/2x/3x 分辨率

文件：修改 `components/ExportDialog.vue`
```

#### 4.2 PDF 导出

```
方案 A（轻量，前端实现）：
  使用浏览器原生 window.print()
  - 在隐藏 iframe 中加载 HTML
  - 注入打印样式（@media print）
  - 调用 iframe.contentWindow.print()
  - 用户选择 "另存为 PDF"

方案 B（高质量，推荐）：
  引入 html2pdf.js 或 jsPDF + html2canvas
  - npm install html2pdf.js
  - 支持自定义页面尺寸（A4/Letter）
  - 支持页边距和页眉页脚
  - 保留矢量文字和高质量图片

推荐方案 B，因为可以控制输出质量和格式。
```

#### 4.3 ZIP 打包导出

```
方案：引入 JSZip 库

ZIP 包结构：
  project-name/
  ├── index.html          // 主设计稿
  ├── assets/
  │   ├── fonts/          // 字体文件（如果使用了自定义字体）
  │   └── images/         // 图片资源
  ├── preview.png         // 预览截图
  └── design-spec.json    // 设计规范元数据（可选）

实现：
1. JSZip 创建压缩包
2. 添加 HTML 文件（内联所有 CSS 和 JS）
3. 添加预览截图（从 PNG 导出逻辑复用）
4. 生成 ZIP 并触发下载

npm install jszip
```

#### 4.4 导出对话框升级

```
ExportDialog 升级为多格式导出面板：

┌─────────────────────────────────────────┐
│  导出设计稿                              │
│                                         │
│  格式选择：                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ HTML │ │  PNG │ │  PDF │ │  ZIP │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  PNG 选项：                              │
│  缩放倍率: [1x] [2x] [3x]              │
│                                         │
│  PDF 选项：                              │
│  纸张大小: [A4 ▾]                       │
│  方向: [纵向] [横向]                     │
│                                         │
│  预览区域：                              │
│  ┌─────────────────────────────┐       │
│  │                             │       │
│  │       设计稿预览             │       │
│  │                             │       │
│  └─────────────────────────────┘       │
│                                         │
│  [复制代码]  [下载文件]                   │
└─────────────────────────────────────────┘
```

#### 4.5 落地步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| Step 1 | 安装 html2pdf.js 和 jszip | `package.json` |
| Step 2 | 新增 `utils/exportHtml.ts` — HTML 导出（已有，重构） | 新建 |
| Step 3 | 新增 `utils/exportPng.ts` — PNG 导出 | 新建 |
| Step 4 | 新增 `utils/exportPdf.ts` — PDF 导出 | 新建 |
| Step 5 | 新增 `utils/exportZip.ts` — ZIP 打包 | 新建 |
| Step 6 | 重构 ExportDialog 支持多格式 | `components/ExportDialog.vue` |
| Step 7 | CanvasWrapper 卡片右键菜单新增快速导出 | `canvas/CanvasWrapper.vue` |

---

## 五、实施优先级和路线图

### Phase 1 — Prompt 工程体系（最优先）

```
1. 设计质量自评
   - 在 system prompt 中追加自评指令
   - ChatPanel 解析展示
   - 工作量：小

2. Skill 选择器
   - 定义 Skill 接口
   - 内置 15-20 个 Skill
   - Skill 选择 UI
   - 工作量：中

3. Preflight 需求确认表单
   - 前端表单组件
   - AI 输出协议设计
   - 与 chat 流程集成
   - 工作量：中大
```

### Phase 2 — 设计规范流程

```
4. 视觉方向选择器
   - 5 个预设方向 + 自动配色
   - HomeView 新增选择入口
   - 工作量：中

5. 品牌资产自动提取
   - 从设计规范提取结构化品牌资产
   - 品牌分析 Prompt
   - 工作量：中

6. 品牌分析器（从 URL/Logo 生成设计规范）
   - 需要视觉分析能力
   - 可能需要多模态模型支持
   - 工作量：大
```

### Phase 3 — 设计系统扩展

```
7. 扩展设计系统库（20-30 个新品牌）
   - 数据工作为主
   - 新增分类筛选 UI
   - 工作量：中
```

### Phase 4 — 多格式导出（最后）

```
8. PNG + PDF 导出
   - 依赖已有（html2canvas）+ 轻量新增（html2pdf.js）
   - 工作量：中小

9. ZIP 打包导出
   - JSZip 集成
   - 资源打包逻辑
   - 工作量：小
```

---

## 六、技术注意事项

### 与 Open Design 的核心差异

```
MindDesign 保持以下独特优势，不盲目跟随 OD：

1. 桌面应用体验（Wails3）
   - 本地性能，不依赖网络
   - 原生文件系统访问
   - 更好的隐私保护

2. Canvas 画布交互（leafer-ui）
   - 真正的可视化画布
   - 缩放、平移、多卡片布局
   - OD 没有 Canvas，只有 iframe 预览

3. 轻量架构
   - 不需要 daemon 进程
   - 不需要外部 Agent CLI
   - 直接调用 LLM API，简单可控

4. 中文优先
   - 面向中文用户
   - 中文 UI、中文设计规范描述
   - 中文设计场景（小红书、微信、淘宝等）
```

### 依赖管理

```
新增依赖（均为轻量前端库）：
- html2pdf.js    ~200KB   PDF 导出
- jszip          ~100KB   ZIP 打包

已有依赖（可直接利用）：
- html2canvas    已安装   截图
- leafer-in/export  已安装  画布导出
```

---

## 七、文件变更清单

```
新增文件：
  prompts/skills.ts            Skill 定义和数据
  prompts/directions.ts        视觉方向定义
  prompts/brandAssets.ts       品牌资产提取
  prompts/brandAnalyzer.ts     品牌分析 Prompt
  components/SkillSelector.vue Skill 选择器
  components/PreflightForm.vue 需求确认表单
  utils/exportPng.ts           PNG 导出
  utils/exportPdf.ts           PDF 导出
  utils/exportZip.ts           ZIP 导出

修改文件：
  prompts/designSpecs.ts       扩展类型定义，新增 20-30 个规范
  prompts/system.ts            集成 Skill、自评、品牌资产
  components/DesignSpecSelector.vue  分类筛选和搜索
  components/ExportDialog.vue  多格式导出面板
  components/ChatPanel.vue     解析自评和 Preflight
  views/HomeView.vue           新增 Skill 和方向选择入口
  canvas/CanvasWrapper.vue     快速导出菜单
  stores/canvasStore.ts        自定义设计规范持久化
  ai/chat.ts                   Skill/Preflight 流程集成
```
