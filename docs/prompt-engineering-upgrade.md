# Prompt 工程体系升级方案

> 核心判断：当前 AI 自由度太大、约束太少，用户说一句话 → AI 直接出完整 HTML，中间无结构化确认，靠"猜"用户要什么。本方案通过三步递进解决。

---

## 第一步：System Prompt 重构

> 最小改动，最大收益。不动 UI、不改流程，只在 prompt 层面做增强。

### 1a. 设计质量自评指令

在 `prompts/system.ts` 的系统提示词末尾追加自评协议：

```
规则：
- AI 生成 HTML 后，必须紧跟着输出一段 JSON 格式的自评
- 5 个维度各打 1-5 分 + 一句话说明
- 前端解析后在 ChatPanel 中渲染为可折叠的评价卡片
- 用户点 "根据建议优化" → AI 自动改进

自评维度：
1. 视觉一致性（1-5）— 颜色、间距、字号是否遵循设计规范
2. 信息层级（1-5）— 标题、正文、辅助信息的层次是否清晰
3. 可用性（1-5）— 交互元素大小、间距是否合理（触控目标 >= 44px）
4. 品牌契合度（1-5）— 是否符合所选设计规范的品牌调性
5. 完整度（1-5）— 页面各区域是否完整，有无遗漏

AI 输出格式：
<!-- DESIGN_CRITIQUE
{
  "scores": {
    "consistency": 4,
    "hierarchy": 5,
    "usability": 3,
    "brand": 4,
    "completeness": 4
  },
  "summary": "整体设计简洁现代，但按钮间距偏小，建议增大至至少44px触控区域。",
  "suggestions": ["增大底部按钮高度至48px", "正文行高调整至1.6"]
}
DESIGN_CRITIQUE -->

为什么先做这个：
- 只改 system.ts + ai/chat.ts + ChatPanel.vue 三个文件
- 不涉及新组件、新流程
- 立刻让每一次生成的质量可见、可度量
- AI 被迫"自我审视"后，生成质量本身也会提高
```

### 1b. 设计约束收紧

当前的 system prompt 对布局、间距的约束比较松。需要增加：

```
间距系统（硬约束）：
- 基础单位 4px
- 允许使用的间距值：4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- 禁止使用 23px、17px、13px 等非标准值

字号层级（硬约束）：
- H1: 32-48px
- H2: 24-28px
- H3: 18-22px
- 正文: 14-16px
- 辅助: 12-13px
- 禁止使用非标准字号（如 15.5px）

安全区域（硬约束）：
- 移动端：触控目标最小 44×44px
- 顶部状态栏 44px，底部 Home Indicator 34px
- 内容区左右边距至少 16px
```

### 1c. 涉及文件

| 文件 | 改动 |
|------|------|
| `prompts/system.ts` | 追加自评协议、间距/字号/安全区域约束 |
| `ai/chat.ts` | 解析 AI 输出中的 `<!-- DESIGN_CRITIQUE ... -->` 块，分离 HTML 和自评数据 |
| `components/ChatPanel.vue` | 渲染自评卡片（5 维雷达图/进度条 + 建议列表 + "根据建议优化"按钮） |

---

## 第二步：Skill 体系

> 中等改动，体验质变。核心思路：不是让用户"随便说"，而是让用户"选场景 + 说需求"。

### 2a. 流程对比

```
当前流程：
  用户输入框 → "帮我设计一个xxx" → AI 直接出图

改造后流程：
  用户先选 Skill（比如"移动端 App"、"数据仪表盘"、"落地页"）
  → 每个 Skill 自带一套精准的 prompt 约束
  → 用户再输入具体需求
  → AI 在 Skill 框架内生成
```

### 2b. DesignSkill 接口

```typescript
interface DesignSkill {
  id: string
  name: string
  icon: string
  category: 'design' | 'marketing' | 'operation' | 'engineering' | 'product'
  description: string
  examplePrompt: string
  defaultPageType: PageType
  systemPromptAddons: string
}
```

### 2c. 内置 Skill 列表

```
design（设计）:
  web-prototype     网页原型         默认 pageType: web
  mobile-app        移动端 App 界面   默认 pageType: app
  dashboard         数据仪表盘       默认 pageType: desktop
  landing-page      落地页           默认 pageType: web
  wireframe         线框图           默认 pageType: web
  design-critique   设计评审         无默认 pageType

marketing（营销）:
  social-carousel   社交媒体轮播图   默认 pageType: app
  email-template    邮件模板         默认 pageType: web
  poster            海报/宣传图      默认 pageType: app
  magazine-page     杂志排版页       默认 pageType: web

operation（运营）:
  kanban-board      看板            默认 pageType: desktop
  data-report       数据报告        默认 pageType: web
  invoice           发据/收据       默认 pageType: web

product（产品）:
  prd-document      产品需求文档     默认 pageType: web
  user-flow         用户流程图       默认 pageType: web
  competitor-analysis 竞品分析看板   默认 pageType: desktop

engineering（工程）:
  api-docs          API 文档页      默认 pageType: web
  status-page       系统状态页      默认 pageType: web
  changelog         更新日志页      默认 pageType: web
```

### 2d. UI 设计

```
在 ChatPanel 顶部（输入框上方）加一个横向滚动的标签条：

┌─────────────────────────────────────────────┐
│ 📱App  🌐落地页  📊仪表盘  📋线框  🎨海报 ...│
└─────────────────────────────────────────────┘
|  输入框                                     |

特点：
- 横向滚动，不占太多空间
- 选中某个 Skill 后，标签高亮
- 可以不选（保持当前自由对话行为）
- 选了 Skill 后，自动切换 pageType
- Skill 的 systemPromptAddons 注入到 buildSystemPrompt
```

### 2e. Skill 的 systemPromptAddons 示例

以 `mobile-app` 为例：

```
## Skill: 移动端 App 界面设计

你正在设计一个移动端 App 界面，请严格遵循以下规范：

### 导航模式
- 底部 Tab 导航（4-5 个图标），高度 83px（含 Home Indicator 区域）
- 或顶部导航栏，高度 44px，标题居中

### 列表和卡片
- 列表项高度固定 56-72px
- 卡片圆角 12-16px，内边距 16px
- 卡片之间间距 12px

### 输入和操作
- 所有可点击元素最小 44×44px
- 主按钮高度 48-52px，圆角 24-26px（药丸形）
- 输入框高度 48px，圆角 12px

### 移动端特有
- 顶部状态栏区域预留 44px（显示时间、信号、电量）
- 底部安全区域预留 34px（Home Indicator）
- 内容区左右边距 16-20px
- 使用 iOS 风格的 SF Symbols 或 Material Symbols 图标

### 典型页面结构
- 导航栏 → 内容区（可滚动）→ 底部操作栏/Tab栏
- 卡片流：使用垂直滚动的卡片列表
- 表单页：分组输入，每组之间 24px 间距
```

### 2f. 涉及文件

| 文件 | 改动 |
|------|------|
| 新增 `prompts/skills.ts` | DesignSkill 接口定义 + 15-20 个内置 Skill 数据 |
| `components/ChatPanel.vue` | 顶部新增 Skill 选择标签条 |
| `stores/canvasStore.ts` | 新增 `activeSkillId` 状态 |
| `prompts/system.ts` | buildSystemPrompt 增加 skill 参数，注入 systemPromptAddons |
| `ai/chat.ts` | sendMessage 时传入当前 Skill |

---

## 第三步：Preflight 需求确认

> 最大改动，但解决根本问题。这是 Open Design 最精髓的设计。

### 3a. 核心思路

```
用户："帮我设计一个电商首页"
→ AI 不出图，而是输出一个结构化的问题表单
→ 前端渲染为可交互的选择卡片
→ 用户选择目标用户、视觉风格、核心模块等
→ AI 结合用户选择 + 设计规范精准出图
```

### 3b. Preflight 协议

```
AI 在首轮对话中不直接生成 HTML，而是输出如下格式的 JSON：

<!-- PREFLIGHT
{
  "type": "preflight",
  "brief_summary": "电商首页设计",
  "questions": [
    {
      "key": "target_audience",
      "label": "目标用户",
      "type": "select",
      "options": [
        { "value": "young_female", "label": "年轻女性（18-30岁）" },
        { "value": "family", "label": "家庭用户" },
        { "value": "enterprise", "label": "企业采购" }
      ]
    },
    {
      "key": "visual_style",
      "label": "视觉风格",
      "type": "select",
      "options": [
        { "value": "minimal", "label": "简约现代" },
        { "value": "trendy", "label": "活力潮流" },
        { "value": "premium", "label": "高端质感" }
      ]
    },
    {
      "key": "key_modules",
      "label": "核心模块（可多选）",
      "type": "multiselect",
      "options": [
        { "value": "banner", "label": "轮播 Banner" },
        { "value": "flash_sale", "label": "秒杀专区" },
        { "value": "recommend", "label": "商品推荐" },
        { "value": "categories", "label": "分类导航" }
      ]
    }
  ]
}
PREFLIGHT -->

前端解析规则：
1. 检测 AI 输出中是否包含 <!-- PREFLIGHT ... PREFLIGHT -->
2. 如果包含，解析 JSON，渲染为交互式表单
3. 不包含，保持当前行为（直接显示 HTML）
```

### 3c. UI 设计

```
ChatPanel 中渲染的 Preflight 表单：

┌─────────────────────────────────────┐
│  🎯 AI 理解了你的需求：电商首页设计   │
│                                     │
│  请确认几个关键信息，帮助我精准设计： │
│                                     │
│  目标用户                            │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │○ 年轻女 │ │● 家庭  │ │○ 企业  │  │
│  │  性     │ │  用户  │ │  采购  │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  视觉风格                            │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │● 简约  │ │○ 活力  │ │○ 高端  │  │
│  │  现代  │ │  潮流  │ │  质感  │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  核心模块（可多选）                    │
│  ☑ 轮播 Banner  ☑ 秒杀专区          │
│  ☑ 商品推荐    ☐ 分类导航            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        开始设计 →             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

风格：
- 深色背景 #16213e，与项目整体一致
- 选中项用 #4f46e5 主色高亮
- 圆角 8-12px 的选项卡片
- 底部"开始设计"按钮
```

### 3d. 数据流

```
1. 用户发送消息 → chat.ts sendMessage()
2. AI 返回包含 PREFLIGHT 块的文本
3. chat.ts 解析出 preflight JSON，返回给前端
4. ChatPanel 渲染 PreflightForm 组件
5. 用户填写并提交
6. 前端将用户选择拼装为补充 prompt：
   "用户确认：目标用户=家庭用户，视觉风格=简约现代，
    核心模块=轮播Banner+秒杀专区+商品推荐。
    请根据以上信息生成设计稿。"
7. 将这段 prompt 作为用户消息发送给 AI（第二轮对话）
8. AI 结合 preflight 答案 + 设计规范生成 HTML
```

### 3e. 触发条件

```
仅在以下条件同时满足时触发 Preflight：
1. 当前会话的第一条用户消息（后续修改直接生成）
2. 用户选择了某个 Skill（Skill 的 preflightPrompt 字段非空）
3. 可以通过设置项让用户关闭此功能

不触发 Preflight 的情况：
- 后续对话（第 2 条消息起）
- 用户未选择 Skill
- 用户消息明确包含 "直接生成"、"不用确认" 等关键词
```

### 3f. 涉及文件

| 文件 | 改动 |
|------|------|
| 新增 `prompts/preflight.ts` | Preflight 协议定义、生成 preflight 指令的 prompt 模板 |
| 新增 `components/PreflightForm.vue` | Preflight 交互表单组件 |
| `ai/chat.ts` | 解析 PREFLIGHT 块、处理 preflight 提交流程 |
| `components/ChatPanel.vue` | 检测并渲染 PreflightForm |
| `prompts/system.ts` | 首轮对话追加 preflight 引导指令 |

---

## 实施路线

```
第一步（1-2天）：System Prompt 重构
  → 自评协议 + 约束收紧
  → 改动 3 个文件
  → 质量立刻可见提升

第二步（2-3天）：Skill 体系
  → Skill 接口 + 15 个内置 Skill + 选择器 UI
  → 改动 5 个文件，新增 1 个文件
  → 用户体验质变

第三步（3-4天）：Preflight 需求确认
  → 协议设计 + 表单组件 + chat 流程集成
  → 改动 4 个文件，新增 2 个文件
  → 返工率大幅下降
```
