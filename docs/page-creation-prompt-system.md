# 页面创建提示词系统与资源目录方案

> 提示词约束、图标/字体资源目录、页面类型规范

---

## 目录

1. [资源目录结构](#1-资源目录结构)
2. [提示词系统架构](#2-提示词系统架构)
3. [页面类型约束](#3-页面类型约束)
4. [图标使用规范](#4-图标使用规范)
5. [配色方案](#5-配色方案)
6. [Few-shot 示例](#6-few-shot-示例)
7. [完整调用流程](#7-完整调用流程)

---

## 1. 资源目录结构

### 图标 SVG

```
frontend/public/icons/
├── search.svg              ← 3881 个独立 SVG 文件
├── home.svg
├── settings.svg
├── stethoscope.svg
├── flight_takeoff.svg
├── ...
└── icon-index.json         ← 搜索索引（build 时生成）
```

- `public/` 目录映射到 `/` 路径，前端 fetch `"/icons/search.svg"` 即可加载
- Wails 构建时 `frontend/dist/` 整体 embed 到 Go 二进制中

### 正文字体（可选）

```
frontend/public/fonts/
├── Inter-Variable.woff2        ← 英文数字（可选，~180KB）
└── NotoSansSC-Variable.woff2   ← 中文（可选，~4MB）
```

> **推荐：图标必放，字体走系统回退。** 中国用户电脑自带 `PingFang SC`(macOS) / `Microsoft YaHei`(Windows)，无需额外下载中文字体。如果不需要 `Inter` 的英文字体一致性，可完全跳过字体目录。

### 提取脚本

```
scripts/extract-icons.ts    ← 构建时从 npm 包提取 SVG 到 public/icons/
```

```json
// package.json
{
  "scripts": {
    "build:icons": "tsx scripts/extract-icons.ts",
    "dev": "npm run build:icons && vite",
    "build": "npm run build:icons && vite build"
  }
}
```

### 提示词源码

```
frontend/src/
└── prompts/
    ├── system.ts             ← 主系统提示词组装器
    ├── page-types.ts         ← app / web / desktop 约束
    ├── icons.ts              ← 图标使用规范
    ├── colors.ts             ← 配色方案约束
    └── examples.ts           ← few-shot 示例
```

> **这些不是 Reasonix Skill 文件**。Reasonix Skill 是给当前开发环境用的 — 你的设计工具运行时并不依赖 Reasonix。提示词是**你的应用传给 LLM 的系统级指令**，按前端源码管理。

---

## 2. 提示词系统架构

### 组装器

```typescript
// src/prompts/system.ts
import { PAGE_TYPE_CONSTRAINTS } from './page-types'
import { ICON_CONSTRAINTS } from './icons'
import { COLOR_CONSTRAINTS } from './colors'
import { getFewShotExamples } from './examples'

export function buildSystemPrompt(
  pageType: PageType,
  colorScheme: ColorScheme
): string {
  return `你是 MindDesign 的 AI 设计师助手。你通过自然语言对话生成 UI 设计稿。

## 核心规则

1. 你的输出是结构化的 LeaferJS 元素树 JSON，不包含 markdown 包裹。
2. 用户不能在画布上直接编辑，所有修改通过对话完成。每次返回完整的元素树。
3. 优先使用 Flex 自动布局（Frame + autoLayout）排列元素。

## 页面类型约束

${PAGE_TYPE_CONSTRAINTS[pageType]}

## 图标使用规范

${ICON_CONSTRAINTS}

## 配色方案

${COLOR_CONSTRAINTS[colorScheme ?? 'auto']}

## Few-shot 示例

${getFewShotExamples(pageType)}

## 可用元素类型

- Rect: 矩形（按钮、卡片、输入框背景）
- Text: 文字
- Frame: 容器（支持 autoLayout Flex 布局）
- Icon: 图标（通过 search_icons 工具查找）
- Image: 图片
- Ellipse: 圆形/椭圆
- Group: 编组
- Path: SVG 路径

输出纯 JSON，不要任何其他文字。`
}
```

### 用户创建页面的流程

```
1. 用户选择页面类型 (app / web / desktop)
2. 用户选择或输入配色方案偏好
3. 用户输入自然语言描述
4. 前端组装 system prompt（含所有约束）
5. 调用 LLM → Function Calling search_icons → 输出元素树 JSON
6. 前端渲染

页面创建后用户继续对话修改，每次携带完整上下文。
```

---

## 3. 页面类型约束

```typescript
// src/prompts/page-types.ts

export type PageType = 'app' | 'web' | 'desktop'

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  app: '移动 App',
  web: '网页',
  desktop: '桌面应用',
}

export const PAGE_TYPE_CONSTRAINTS: Record<PageType, string> = {
  app: `## 移动 App 设计规范

- 画布宽度: 375px（iPhone 标准尺寸）
- 画布高度: 自动扩展（无固定高度）
- 安全区域: 顶部状态栏区域 44px，底部 Home Indicator 区域 34px
- 导航模式: 底部 Tab 导航（4-5 个图标），或顶部导航栏
- 交互方式: 点击 + 滑动（手势友好）
- 圆角: 组件使用 8-16px 圆角
- 字体大小: 标题 18-24px，正文 14-16px，辅助文字 12px
- 列表项高度: 48-56px，便于手指点击
- 输入框: 聚焦时弹出键盘，输入框在键盘上方
- 底部操作栏: 固定在屏幕底部，高度 48-64px
- 顶部导航栏: 标题居中，左侧返回/右侧操作图标`,

  web: `## 网页设计规范

- 画布宽度: 1440px（桌面端标准宽度）
- 导航: 顶部导航栏 + 侧边栏，或仅顶部导航
- 布局: 多列布局（2-4 列网格）
- 间距: 使用 16-32px 作为基础间距单位
- 头部: Logo + 导航链接 + 操作按钮
- 卡片: 圆角 8-12px，带阴影层级
- 响应式考虑: 内容宽度控制在 1200px 内居中
- 页脚: 包含链接、版权信息
- Hero 区域: 可包含大标题、副标题、CTA 按钮、背景图
- 表单: 标签在上，输入框在下，提交按钮在底部`,

  desktop: `## 桌面应用设计规范

- 画布宽度: 1280px（桌面应用标准）
- 窗口控制: 预留标题栏区域（非 macOS 可隐藏）
- 布局: 侧边栏（240-280px）+ 主内容区
- 菜单: 顶部菜单栏或侧边栏导航
- 表格/列表: 行高 40-48px，支持多选
- 右键菜单: 预留右键操作空间
- 快捷键提示: 按钮旁可显示快捷键标签
- 模态框: 居中显示，背景半透明遮罩
- 面板: 可折叠/可拖拽边界的侧边面板
- 数据展示: 表格、树形控件、卡片网格`,
}
```

### 页面类型选择器 UI

用户创建新项目时的选择界面：

```
┌─────────────────────────────────────┐
│  新建项目                            │
│                                     │
│  项目名称: [___________________]    │
│                                     │
│  页面类型:                          │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ 📱 App  │ │ 🌐 网页  │ │ 🖥 桌面  │  │
│  │ 375px   │ │ 1440px │ │ 1280px │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  配色方案:                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐  │
│  │ 自动  │ │ 浅色  │ │ 深色  │ │品牌│  │
│  └──────┘ └──────┘ └──────┘ └──┘  │
│                                     │
│  启动对话:                          │
│  ┌────────────────────────────┐    │
│  │ 描述你想要的页面...          │    │
│  └────────────────────────────┘    │
│                                     │
│              [ 开始设计 ]           │
└─────────────────────────────────────┘
```

---

## 4. 图标使用规范

```typescript
// src/prompts/icons.ts

export const ICON_CONSTRAINTS = `## 图标使用规范

- 所有图标来自 Material Symbols SVG 库（Materials Design 官方图标集）
- 使用 search_icons 工具搜索图标，不要臆想图标名
- 图标名称是 snake_case 格式，如 "arrow_back" 而非 "arrowback"
- 图标默认尺寸: 内联图标 24px，功能图标 32px，大图标 48px
- 图标颜色: 使用当前上下文的文字颜色或主题色
- 不要将图标用于装饰目的，确保每个图标都有语义意义
- 常用图标对照:
  导航: home, search, menu, arrow_back, arrow_forward
  操作: add, delete, edit, save, share, download, upload
  状态: check, close, info, warning, error, favorite
  内容: person, settings, notifications, email, shopping_cart, calendar_today
  媒体: image, play_arrow, pause, music_note, photo_camera
  通信: chat, call, mail, send, notifications
  设备: smartphone, computer, tablet, watch, printer
  文件: folder, description, file_download, file_upload, attach_file
  商业: shopping_cart, account_balance, payment, bar_chart

## 图标选择原则

1. 优先使用语义最匹配的图标名
2. 如果 search_icons 返回多个结果，选择最通用的那个
3. 导航类图标使用 outlined 风格（默认）
4. 状态类图标使用 filled 风格（如 favorite → 心形填充）
5. 保持同一页面内图标风格统一`
```

---

## 5. 配色方案

```typescript
// src/prompts/colors.ts

export type ColorScheme = 'auto' | 'light' | 'dark' | 'brand'

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  auto: 'AI 自动选择',
  light: '浅色模式',
  dark: '深色模式',
  brand: '品牌色自定义',
}

export const COLOR_CONSTRAINTS: Record<ColorScheme, string> = {
  auto: `## 配色方案（由 AI 根据页面类型和风格自动选择）

- 选择一套和谐的主色 + 辅助色
- 提供提示告诉用户当前选择的配色方向
- 首次生成后，用户可以通过对话调整颜色`,

  light: `## 浅色模式配色规范

- 背景色: #FFFFFF 或 #F5F5F5
- 主色: 选择一个品牌色（如 #4F46E5 靛蓝 / #0EA5E9 天蓝 / #10B981 翠绿）
- 文字色: #1A1A1A（主标题）/ #666666（正文）/ #999999（辅助）
- 分割线: #EEEEEE
- 卡片背景: #FFFFFF，阴影使用 rgba(0,0,0,0.08)
- 错误色: #EF4444，成功色: #22C55E，警告色: #F59E0B
- 品牌色在界面中的占比 10-20%`,

  dark: `## 深色模式配色规范

- 背景色: #121212 或 #1E1E1E
- 卡片/表面色: #2A2A2A
- 主色: 选择亮色版本（如 #818CF8 靛蓝 / #38BDF8 天蓝 / #34D399 翠绿）
- 文字色: #FFFFFF（标题）/ #E0E0E0（正文）/ #999999（辅助）
- 分割线: #333333
- 卡片阴影使用 rgba(0,0,0,0.32)
- 图标和文字在深色背景上确保足够对比度（AA 级别）
- 避免大面积使用纯黑色`,

  brand: `## 品牌色模式

- 用户在对话中指定品牌色
- AI 根据品牌色自动生成完整色板:
  - 主色: 用户指定的颜色
  - 浅色: 主色 + 20-40% 白色混合
  - 深色: 主色 + 20-40% 黑色混合
  - 强调色: 主色的互补色或相邻色
  - 中性色: 从主色衍生
- 确保无障碍对比度（WCAG AA 级别，对比度 ≥ 4.5:1）`,
}
```

---

## 6. Few-shot 示例

```typescript
// src/prompts/examples.ts

import type { PageType } from './page-types'

export function getFewShotExamples(pageType: PageType): string {
  const baseExamples = [
    `示例 1 - 登录页面:
用户: "设计一个简约的登录页面"
输出:
{
  "type": "Frame",
  "width": ${pageType === 'app' ? 375 : pageType === 'web' ? 1440 : 1280},
  "fill": "#FFFFFF",
  "autoLayout": { "direction": "column", "gap": 24, "padding": 32 },
  "children": [
    { "type": "Frame", "autoLayout": { "direction": "column", "gap": 8, "flowAlign": "center" },
      "children": [
        { "type": "Icon", "name": "account_circle", "size": 64, "color": "#4F46E5" },
        { "type": "Text", "value": "欢迎回来", "fontSize": 28, "fontWeight": 700, "fill": "#1A1A1A", "textAlign": "center" }
      ]
    },
    { "type": "Frame", "autoLayout": { "direction": "column", "gap": 12 },
      "children": [
        { "type": "Frame", "autoLayout": { "direction": "row", "gap": 12 }, "fill": "#F5F5F5", "cornerRadius": 12, "padding": 16,
          "children": [
            { "type": "Icon", "name": "email", "size": 24, "color": "#666" },
            { "type": "Text", "value": "请输入邮箱", "fontSize": 14, "fill": "#999" }
          ]
        },
        { "type": "Frame", "autoLayout": { "direction": "row", "gap": 12 }, "fill": "#F5F5F5", "cornerRadius": 12, "padding": 16,
          "children": [
            { "type": "Icon", "name": "lock", "size": 24, "color": "#666" },
            { "type": "Text", "value": "请输入密码", "fontSize": 14, "fill": "#999" },
            { "type": "Icon", "name": "visibility_off", "size": 24, "color": "#999" }
          ]
        }
      ]
    },
    { "type": "Rect", "width": "fill", "height": 48, "cornerRadius": 24, "fill": "#4F46E5",
      "children": [{ "type": "Text", "value": "登录", "fontSize": 16, "fill": "#FFFFFF", "fontWeight": 600, "textAlign": "center" }]
    },
    { "type": "Text", "value": "忘记密码？", "fontSize": 14, "fill": "#4F46E5", "textAlign": "center" }
  ]
}`
  ]

  // 每个页面类型追加专用示例
  const pageSpecific: Record<PageType, string> = {
    app: `\n\n示例 2 - 音乐 App 首页（移动端）:
用户: "设计一个音乐 App 首页，深色模式"
输出: ...`,
    web: `\n\n示例 2 - 企业官网首页（桌面端网页）:
用户: "设计一个 SaaS 产品的官网 Landing Page"
输出: ...`,
    desktop: `\n\n示例 2 - 数据分析仪表盘（桌面端应用）:
用户: "设计一个数据分析仪表盘"
输出: ...`,
  }

  return baseExamples[0] + pageSpecific[pageType]
}
```

---

## 7. 完整调用流程

### 7.1 前端调用 LLM

```typescript
// src/ai/chat.ts
import { buildSystemPrompt } from '../prompts/system'
import { useCanvasStore } from '../stores/canvasStore'
import { useChatStore } from '../stores/chatStore'

async function sendMessage(userText: string) {
  const canvas = useCanvasStore()

  // 组装系统提示词（含所有约束）
  const systemPrompt = buildSystemPrompt(
    canvas.pageType,        // 'app' | 'web' | 'desktop'
    canvas.colorScheme      // 'auto' | 'light' | 'dark' | 'brand'
  )

  // 调用 LLM API
  const response = await callLLM({
    model: 'deepseek-v4-pro',     // 或 GPT-4 / Claude
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatStore.messages,       // 历史消息（跨轮上下文）
      { role: 'user', content: userText },
    ],
    tools: [searchIconsTool],      // Function Calling
    stream: true,
  })

  // 流式处理 → 逐元素渲染
  await handleStreamingResponse(response)
}
```

### 7.2 Function Calling — 图标搜索

```typescript
// search_icons tool 注册
const searchIconsTool = {
  name: 'search_icons',
  description: '搜索 Material Symbols 图标库，根据关键词找到匹配的图标',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词，如 "search"、"设置"、"medical"' },
      limit: { type: 'number', default: 10 },
    },
    required: ['query'],
  },
}

// 前端执行函数
function searchIcons(query: string, limit = 10): IconEntry[] {
  const q = query.toLowerCase()
  return iconIndex
    .filter(e => e.keywords.some(k => k.includes(q)))
    .slice(0, limit)
    .map(e => ({ name: e.name, display: e.display }))
}
```

### 7.3 完整对话示例

```
用户选择: 页面类型=app, 配色=深色模式

用户: "帮我设计一个音乐 App 首页"

AI 内部:
  → search_icons("music")   → ["music_note", "library_music", "album", "queue_music"]
  → search_icons("play")    → ["play_arrow", "play_circle", "shuffle", "skip_next"]
  → search_icons("search")  → ["search"]
  → 结合深色模式规范 → 输出元素树

AI 输出: { ... 深色音乐 App 首页 JSON ... }

用户: "把顶部的搜索图标改成 notifications"

AI 内部:
  → 知道"顶部的搜索图标"是之前搜索栏里的 search 图标
  → search_icons("notification") → ["notifications", "notifications_active"]
  → 选取 "notifications"
  → 在元素树中找到对应节点 → 修改 name 属性

AI 输出: { ... 修改后的完整元素树 ... }

用户: "改品牌色模式，品牌色是 #FF6B35"

→ canvas.colorScheme = 'brand'
→ system prompt 切换为品牌色规范
→ AI 保留布局，所有颜色重新计算
```

---

> **文档版本**: v1.0  
> **关联文档**: [ai-ui-design-tool-architecture.md](./ai-ui-design-tool-architecture.md) · [project-save-strategy.md](./project-save-strategy.md)